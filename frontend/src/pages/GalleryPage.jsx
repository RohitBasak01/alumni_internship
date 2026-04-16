import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../context/AuthContext.jsx";
import { createGalleryItem, deleteGalleryItem, fetchGalleryItems } from "../lib/api.js";

const sectionLabels = {
  images: "Institute Images",
  videos: "Institute Videos",
  personal_photos: "Personal Photos"
};

const emptyForm = {
  url: "",
  caption: ""
};

function formatDate(value) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric"
  });
}

function GalleryCard({ item, canDelete, onDelete }) {
  const isVideo = item.mediaType === "video";

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
        {isVideo ? (
          <video className="h-48 w-full bg-black object-cover" controls preload="metadata" src={item.url} />
        ) : (
          <img alt={item.caption || "Gallery media"} className="h-48 w-full object-cover" loading="lazy" src={item.url} />
        )}
      </div>
      <div className="mt-3 grid gap-1">
        <strong className="text-sm text-slate-800">{item.caption || "Untitled"}</strong>
        <span className="text-xs text-slate-500">
          By {item.uploader?.name || "Unknown"} | {formatDate(item.createdAt)}
        </span>
      </div>
      {canDelete ? (
        <button
          className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
          onClick={() => onDelete(item._id)}
          type="button"
        >
          Remove
        </button>
      ) : null}
    </article>
  );
}

function GalleryPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = auth.user?.role === "institute_admin";
  const isAlumni = auth.user?.role === "alumni";

  const [adminImageForm, setAdminImageForm] = useState(emptyForm);
  const [adminVideoForm, setAdminVideoForm] = useState(emptyForm);
  const [personalForm, setPersonalForm] = useState(emptyForm);

  const galleryQuery = useQuery({
    queryKey: ["gallery-items"],
    queryFn: fetchGalleryItems
  });

  const createMutation = useMutation({
    mutationFn: createGalleryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery-items"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGalleryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery-items"] });
    }
  });

  const groupedItems = useMemo(() => {
    const items = galleryQuery.data || [];

    return {
      images: items.filter((item) => item.section === "images"),
      videos: items.filter((item) => item.section === "videos"),
      personal_photos: items.filter((item) => item.section === "personal_photos")
    };
  }, [galleryQuery.data]);

  function submitSection(section, mediaType, form, setForm) {
    createMutation.mutate(
      {
        section,
        mediaType,
        url: form.url,
        caption: form.caption
      },
      {
        onSuccess: () => {
          setForm(emptyForm);
        }
      }
    );
  }

  function canDelete(item) {
    if (isAdmin) {
      return true;
    }

    if (!isAlumni) {
      return false;
    }

    return item.section === "personal_photos" && item.uploader?.id === auth.user?.id;
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Gallery</h1>
        <p className="mt-2 text-sm text-slate-600">
          Three sections are available: institute images, institute videos, and alumni personal photos.
        </p>
      </section>

      {isAdmin ? (
        <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800">Upload as Institute Admin</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-700">Add to Images</p>
              <input
                className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                onChange={(event) =>
                  setAdminImageForm((current) => ({ ...current, url: event.target.value }))
                }
                placeholder="https://..."
                type="url"
                value={adminImageForm.url}
              />
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                onChange={(event) =>
                  setAdminImageForm((current) => ({ ...current, caption: event.target.value }))
                }
                placeholder="Caption"
                type="text"
                value={adminImageForm.caption}
              />
              <button
                className="mt-3 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
                onClick={() => submitSection("images", "image", adminImageForm, setAdminImageForm)}
                type="button"
              >
                Upload Image
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-700">Add to Videos</p>
              <input
                className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                onChange={(event) =>
                  setAdminVideoForm((current) => ({ ...current, url: event.target.value }))
                }
                placeholder="https://..."
                type="url"
                value={adminVideoForm.url}
              />
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                onChange={(event) =>
                  setAdminVideoForm((current) => ({ ...current, caption: event.target.value }))
                }
                placeholder="Caption"
                type="text"
                value={adminVideoForm.caption}
              />
              <button
                className="mt-3 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
                onClick={() => submitSection("videos", "video", adminVideoForm, setAdminVideoForm)}
                type="button"
              >
                Upload Video
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {isAlumni ? (
        <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800">Upload Personal Photo</h2>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <input
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
              onChange={(event) =>
                setPersonalForm((current) => ({ ...current, url: event.target.value }))
              }
              placeholder="https://..."
              type="url"
              value={personalForm.url}
            />
            <input
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
              onChange={(event) =>
                setPersonalForm((current) => ({ ...current, caption: event.target.value }))
              }
              placeholder="Caption"
              type="text"
              value={personalForm.caption}
            />
            <button
              className="mt-3 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
              onClick={() =>
                submitSection("personal_photos", "image", personalForm, setPersonalForm)
              }
              type="button"
            >
              Upload Personal Photo
            </button>
          </div>
        </section>
      ) : null}

      {["images", "videos", "personal_photos"].map((section) => (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" key={section}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-800">{sectionLabels[section]}</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {groupedItems[section].length}
            </span>
          </div>

          {groupedItems[section].length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {groupedItems[section].map((item) => (
                <GalleryCard
                  canDelete={canDelete(item)}
                  item={item}
                  key={item._id}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No media added yet in this section.</p>
          )}
        </section>
      ))}

      {createMutation.isError ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {createMutation.error.message}
        </p>
      ) : null}
      {deleteMutation.isError ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {deleteMutation.error.message}
        </p>
      ) : null}
      {galleryQuery.isError ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {galleryQuery.error.message}
        </p>
      ) : null}
    </div>
  );
}

export default GalleryPage;
