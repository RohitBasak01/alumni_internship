import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { upsertMentorshipE2eePublicKey, syncMentorshipConversationEnvelopes } from "../lib/api.js";
import {
  ensureE2eeDeviceKeyPair,
  decryptConversationSecretEnvelope,
  generateConversationSecret,
  encryptConversationSecretForPublicKey,
  getConversationKeyFingerprint,
} from "../lib/e2ee.js";

export function useMentorshipE2EE(auth, activeConversation) {
  const queryClient = useQueryClient();
  const [devicePrivateKeyJwk, setDevicePrivateKeyJwk] = useState(null);
  const [devicePublicKeySerialized, setDevicePublicKeySerialized] = useState("");
  const [isE2eeInitializing, setIsE2eeInitializing] = useState(false);
  const [conversationSecret, setConversationSecret] = useState("");
  const [conversationSecretInput, setConversationSecretInput] = useState("");
  const [conversationKeyFingerprint, setConversationKeyFingerprint] = useState("");
  const [isConversationKeyVerified, setIsConversationKeyVerified] = useState(false);
  const [error, setError] = useState("");

  const e2eeSyncSignatureRef = useRef(new Map());

  const getSecretStorageKey = (id) => `mentorship:e2ee:${id}`;
  const getVerificationStorageKey = (id) => `mentorship:e2ee:verified:${id}`;

  // Initialize device keys
  useEffect(() => {
    if (auth.user?.role !== "alumni") return;

    let isCancelled = false;
    async function bootstrap() {
      setIsE2eeInitializing(true);
      try {
        const keyPair = await ensureE2eeDeviceKeyPair();
        if (isCancelled) return;

        setDevicePrivateKeyJwk(keyPair.privateKeyJwk);
        setDevicePublicKeySerialized(keyPair.publicKeySerialized);

        await upsertMentorshipE2eePublicKey({
          publicKey: keyPair.publicKeySerialized,
          algorithm: "RSA-OAEP"
        });

        await queryClient.invalidateQueries({ queryKey: ["alumni-conversations"] });
        await queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
      } catch (err) {
        if (!isCancelled) setError("Unable to initialize secure messaging keys.");
      } finally {
        if (!isCancelled) setIsE2eeInitializing(false);
      }
    }
    bootstrap();
    return () => { isCancelled = true; };
  }, [auth.user?.role, queryClient]);

  // Manage conversation secret
  useEffect(() => {
    if (!activeConversation?._id) {
      setConversationSecret("");
      setConversationSecretInput("");
      setConversationKeyFingerprint("");
      setIsConversationKeyVerified(false);
      return;
    }

    const storageKey = getSecretStorageKey(activeConversation._id);
    const verifiedKey = getVerificationStorageKey(activeConversation._id);
    const storedSecret = localStorage.getItem(storageKey) || "";
    const verifiedValue = localStorage.getItem(verifiedKey) === "true";

    setConversationSecret(storedSecret);
    setConversationSecretInput(storedSecret);
    setIsConversationKeyVerified(verifiedValue);
  }, [activeConversation?._id]);

  // Sync/Ensure conversation secret
  useEffect(() => {
    if (!activeConversation?._id || !auth.user?.id || !devicePrivateKeyJwk || !devicePublicKeySerialized) return;

    let isCancelled = false;
    const conversationId = activeConversation._id;
    const currentUserId = String(auth.user.id);

    async function ensureSecret() {
      setIsE2eeInitializing(true);
      try {
        const participantKeys = activeConversation.e2ee?.participantKeys || [];
        const envelopeEntries = activeConversation.e2ee?.envelopes || [];
        const participantKeyByUserId = new Map(participantKeys.map(k => [k.userId, k.publicKey]));
        
        if (!participantKeyByUserId.has(currentUserId)) {
          participantKeyByUserId.set(currentUserId, devicePublicKeySerialized);
        }

        const storageKey = getSecretStorageKey(conversationId);
        const storedSecret = localStorage.getItem(storageKey) || "";
        let resolvedSecret = "";

        // Check if other participants already have envelopes.
        // This means a secret was already established on the other side.
        const othersHaveEnvelopes = envelopeEntries.some(
          (e) => e.userId !== currentUserId && e.encryptedKey,
        );

        // 1st priority: decrypt our own envelope (most authoritative source)
        const ownEnvelope = envelopeEntries.find((e) => e.userId === currentUserId);
        if (ownEnvelope?.encryptedKey) {
          try {
            resolvedSecret = await decryptConversationSecretEnvelope(
              ownEnvelope.encryptedKey,
              devicePrivateKeyJwk,
            );
          } catch {
            resolvedSecret = "";
          }
        }

        // 2nd priority: use localStorage only if we were the originator
        // (i.e., no other envelopes exist — meaning we generated the secret first)
        if (!resolvedSecret && storedSecret && !othersHaveEnvelopes) {
          resolvedSecret = storedSecret;
        }

        // If others have envelopes but we don't have ours yet, clear any stale
        // locally-generated secret — it won't match the established shared key.
        if (!resolvedSecret && othersHaveEnvelopes && storedSecret) {
          localStorage.removeItem(storageKey);
        }

        // 3rd priority: generate a new secret only when no envelopes exist at all
        // (we are the first participant to set up encryption for this conversation)
        if (!resolvedSecret && !othersHaveEnvelopes) {
          resolvedSecret = generateConversationSecret();
        }

        // If resolvedSecret is still empty here, we are waiting for the other
        // participant to create our envelope. Do not store or set anything yet.

        // Only sync envelopes for missing participants if we have a valid secret.
        // (If resolvedSecret is empty we're waiting for our envelope — skip sync.)
        if (resolvedSecret) {
          const envelopeByUserId = new Map(envelopeEntries.map(e => [e.userId, e]));
          const missingTargets = [...participantKeyByUserId.entries()]
            .filter(([userId, pubKey]) => pubKey && !envelopeByUserId.has(userId))
            .map(([userId, publicKey]) => ({ userId, publicKey }));

          if (missingTargets.length) {
            const signature = `${conversationId}:${missingTargets.map(t => t.userId).sort().join("|")}`;
            if (e2eeSyncSignatureRef.current.get(conversationId) !== signature) {
              e2eeSyncSignatureRef.current.set(conversationId, signature);
              const envelopes = [];
              for (const target of missingTargets) {
                const encryptedKey = await encryptConversationSecretForPublicKey(resolvedSecret, target.publicKey);
                envelopes.push({ userId: target.userId, encryptedKey, algorithm: "RSA-OAEP", version: "conv-v1" });
              }
              if (envelopes.length) {
                await syncMentorshipConversationEnvelopes(conversationId, { envelopes });
                await queryClient.invalidateQueries({ queryKey: ["alumni-conversations"] });
                await queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
              }
            }
          }
        }

        if (isCancelled) return;
        if (resolvedSecret) {
          localStorage.setItem(storageKey, resolvedSecret);
          setConversationSecret(resolvedSecret);
          setConversationSecretInput(resolvedSecret);
        } else {
          // Still waiting for our envelope — clear state so UI shows "Encrypted message"
          setConversationSecret("");
          setConversationSecretInput("");
        }
        setError("");
      } catch (err) {
        if (!isCancelled) setError("Secure channel initializing...");
      } finally {
        if (!isCancelled) setIsE2eeInitializing(false);
      }
    }
    ensureSecret();
    return () => { isCancelled = true; };
  }, [activeConversation?._id, activeConversation?.e2ee, auth.user?.id, devicePrivateKeyJwk, devicePublicKeySerialized, queryClient]);

  // Fingerprint update
  useEffect(() => {
    let isCancelled = false;
    async function updateFingerprint() {
      if (!activeConversation?._id || !conversationSecret) {
        setConversationKeyFingerprint("");
        return;
      }
      try {
        const fingerprint = await getConversationKeyFingerprint(conversationSecret, activeConversation._id);
        if (!isCancelled) setConversationKeyFingerprint(fingerprint);
      } catch {
        if (!isCancelled) setConversationKeyFingerprint("");
      }
    }
    updateFingerprint();
    return () => { isCancelled = true; };
  }, [activeConversation?._id, conversationSecret]);

  const saveSecret = useCallback((newSecret) => {
    if (!activeConversation?._id) return;
    const storageKey = getSecretStorageKey(activeConversation._id);
    const verifiedKey = getVerificationStorageKey(activeConversation._id);
    if (newSecret.trim()) {
      localStorage.setItem(storageKey, newSecret.trim());
      localStorage.removeItem(verifiedKey);
    } else {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(verifiedKey);
    }
    setConversationSecret(newSecret.trim());
    setConversationSecretInput(newSecret.trim());
    setIsConversationKeyVerified(false);
  }, [activeConversation?._id]);

  const verifySecret = useCallback(() => {
    if (!activeConversation?._id || !conversationSecret) return;
    localStorage.setItem(getVerificationStorageKey(activeConversation._id), "true");
    setIsConversationKeyVerified(true);
  }, [activeConversation?._id, conversationSecret]);

  return {
    conversationSecret,
    conversationSecretInput,
    setConversationSecretInput,
    conversationKeyFingerprint,
    isConversationKeyVerified,
    isE2eeInitializing,
    devicePrivateKeyJwk,
    devicePublicKeySerialized,
    error,
    saveSecret,
    verifySecret,
  };
}

export const useAlumniConversationE2EE = useMentorshipE2EE;
