import nodemailer from "nodemailer";

function getInstitutionEmailLabels(institutionType = "college") {
  const isSchool = institutionType === "school";

  return {
    isSchool,
    portalName: isSchool ? "community portal" : "alumni portal",
    memberLabel: isSchool ? "former student" : "alumni",
    yearLabel: isSchool ? "Leaving Year" : "Batch",
    educationLabel: isSchool ? "Last Class Attended" : "Department",
    currentOrgLabel: isSchool ? "Current Institution" : "Company",
    roleLabel: isSchool ? "Occupation" : "Position"
  };
}

function buildProfileDetailRows(profile, institutionType = "college") {
  const labels = getInstitutionEmailLabels(institutionType);
  const rows = [
    `<p><strong>Name:</strong> ${profile.name}</p>`,
    `<p><strong>Email:</strong> <a href="mailto:${profile.email}">${profile.email}</a></p>`
  ];

  const yearValue = labels.isSchool ? profile.leavingYear || profile.batch : profile.batch;
  const educationValue = labels.isSchool ? profile.lastClassAttended || profile.department : profile.department;
  const currentOrgValue = labels.isSchool ? profile.currentInstitution : profile.company;
  const roleValue = labels.isSchool ? profile.occupation || profile.currentEducation : profile.designation;

  if (currentOrgValue) rows.push(`<p><strong>${labels.currentOrgLabel}:</strong> ${currentOrgValue}</p>`);
  if (roleValue) rows.push(`<p><strong>${labels.roleLabel}:</strong> ${roleValue}</p>`);
  if (yearValue) rows.push(`<p><strong>${labels.yearLabel}:</strong> ${yearValue}</p>`);
  if (educationValue) rows.push(`<p><strong>${labels.educationLabel}:</strong> ${educationValue}</p>`);
  if (profile.location) rows.push(`<p><strong>Location:</strong> ${profile.location}</p>`);
  if (profile.bio) rows.push(`<p><strong>Bio:</strong> ${profile.bio}</p>`);
  if (profile.skills && profile.skills.length) rows.push(`<p><strong>Skills:</strong> ${profile.skills.join(", ")}</p>`);

  return rows.join("");
}

function getEmailConfig() {
  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || process.env.SMTP_USER || "no-reply@alumninetwork.local"
  };
}

function hasSmtpConfig(config) {
  return Boolean(config.host && config.port && config.user && config.pass);
}

export async function sendInviteEmail({
  to,
  alumniName,
  recipientName,
  instituteName,
  inviteUrl,
  expiresAt,
  portalRoleLabel = "alumni",
  institutionType = "college"
}) {
  const config = getEmailConfig();
  const name = recipientName || alumniName || "there";
  const labels = getInstitutionEmailLabels(institutionType);

  if (!hasSmtpConfig(config)) {
    console.log("SMTP not configured. Invite email was not sent.");
    console.log(`Invite recipient: ${to}`);
    console.log(`Invite link: ${inviteUrl}`);

    return {
      delivered: false,
      mode: "log",
      message: "SMTP is not configured. Invite link is available in the API response.",
      previewUrl: null
    };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });

  const info = await transporter.sendMail({
    from: config.from,
    to,
    subject: `Set up your ${instituteName} ${portalRoleLabel} account`,
    text: [
      `Hello ${name},`,
      "",
      `You have been invited to join the ${instituteName} ${labels.portalName} as ${portalRoleLabel}.`,
      `Set your password here: ${inviteUrl}`,
      `This link expires on ${new Date(expiresAt).toLocaleString()}.`,
      "",
      "If you were not expecting this invitation, you can ignore this email."
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #14213d; line-height: 1.6;">
        <h2>Welcome to the ${instituteName} ${labels.portalName}</h2>
        <p>Hello ${name},</p>
        <p>You have been invited to join the ${labels.portalName} as ${portalRoleLabel}.</p>
        <p>
          <a
            href="${inviteUrl}"
            style="display:inline-block;padding:12px 18px;background:#14213d;color:#ffffff;text-decoration:none;border-radius:8px;"
          >
            Set Your Password
          </a>
        </p>
        <p>If the button does not work, use this link:</p>
        <p><a href="${inviteUrl}">${inviteUrl}</a></p>
        <p>This link expires on ${new Date(expiresAt).toLocaleString()}.</p>
      </div>
    `
  });

  return {
    delivered: true,
    mode: "smtp",
    message: "Invite email sent successfully.",
    previewUrl: nodemailer.getTestMessageUrl(info) || null
  };
}

export async function sendApplicationEmail({
  jobPosterEmail,
  jobPosterName,
  jobTitle,
  applicantName,
  applicantEmail,
  institutionType = "college",
  applicantProfile = {},
  coverLetter,
  resumeUrl,
  resumeFileName
}) {
  const config = getEmailConfig();
  const labels = getInstitutionEmailLabels(institutionType);

  if (!hasSmtpConfig(config)) {
    console.log("SMTP not configured. Application notification email was not sent.");
    console.log(`Job poster: ${jobPosterEmail}`);
    console.log(`Applicant: ${applicantName} (${applicantEmail})`);
    return {
      delivered: false,
      mode: "log",
      message: "SMTP is not configured."
    };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });

  const profileDetails = `
    <div style="background:#f8fbff;padding:12px;border-radius:8px;margin:16px 0;">
      <h3 style="margin:0 0 12px 0;">Applicant Profile</h3>
      ${buildProfileDetailRows(
        {
          ...applicantProfile,
          name: applicantName,
          email: applicantEmail
        },
        institutionType
      )}
    </div>
  `;

  const resumeSection = resumeFileName ? `
    <div style="margin:16px 0;">
      <p><strong>Resume:</strong> ${resumeFileName} (attached)</p>
    </div>
  ` : "";

  const coverLetterSection = coverLetter ? `
    <div style="background:#f0f9ff;padding:12px;border-left:4px solid #0284c7;margin:16px 0;">
      <h3 style="margin:0 0 8px 0;">Cover Letter</h3>
      <p>${coverLetter.replace(/\n/g, "<br>")}</p>
    </div>
  ` : "";

  // Build attachments array
  const attachments = [];
  
  // Extract and attach resume if provided
  if (resumeUrl && resumeFileName) {
    try {
      // Check if it's a data URL
      if (resumeUrl.startsWith('data:')) {
        const [header, base64Data] = resumeUrl.split(',');
        const buffer = Buffer.from(base64Data, 'base64');
        attachments.push({
          filename: resumeFileName,
          content: buffer
        });
      }
    } catch (err) {
      console.error("Failed to attach resume:", err);
    }
  }

  const info = await transporter.sendMail({
    from: config.from,
    to: jobPosterEmail,
    subject: `New Application for ${jobTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#121a31;">
        <h2>New Job Application</h2>
        <p>Hi ${jobPosterName},</p>
        <p><strong>${applicantName}</strong> has applied for your job posting: <strong>${jobTitle}</strong></p>
        
        ${profileDetails}
        ${resumeSection}
        ${coverLetterSection}
        
        <p style="margin-top:24px;">You can contact the applicant directly at <a href="mailto:${applicantEmail}">${applicantEmail}</a></p>
        <p style="color:#6b7280;font-size:14px;margin-top:24px;">This is an automated message from the Alumni Network ${labels.portalName}.</p>
      </div>
    `,
    attachments: attachments
  });

  return {
    delivered: true,
    mode: "smtp",
    message: "Application notification sent to job poster.",
    previewUrl: nodemailer.getTestMessageUrl(info) || null
  };
}

export async function sendConnectionRequestEmail({
  recipientEmail,
  recipientName,
  requesterName,
  requesterEmail,
  institutionType = "college",
  requesterProfile = {},
  message
}) {
  const config = getEmailConfig();
  const labels = getInstitutionEmailLabels(institutionType);

  if (!hasSmtpConfig(config)) {
    console.log("SMTP not configured. Connection request email was not sent.");
    console.log(`Recipient: ${recipientEmail}`);
    console.log(`Requester: ${requesterName} (${requesterEmail})`);
    return {
      delivered: false,
      mode: "log",
      message: "SMTP is not configured."
    };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });

  const profileDetails = `
    <div style="background:#f8fbff;padding:12px;border-radius:8px;margin:16px 0;">
      <h3 style="margin:0 0 12px 0;">Profile</h3>
      ${buildProfileDetailRows(
        {
          ...requesterProfile,
          name: requesterName,
          email: requesterEmail
        },
        institutionType
      )}
    </div>
  `;

  const info = await transporter.sendMail({
    from: config.from,
    to: recipientEmail,
    subject: `${requesterName} wants to connect with you`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#121a31;">
        <h2>New Connection Request</h2>
        <p>Hi ${recipientName},</p>
        <p><strong>${requesterName}</strong> wants to connect with you on the Alumni Network!</p>
        
        ${profileDetails}
        
        <div style="background:#f0f9ff;padding:12px;border-left:4px solid #0284c7;margin:16px 0;">
          <h3 style="margin:0 0 8px 0;">Message</h3>
          <p>${message.replace(/\n/g, "<br>")}</p>
        </div>
        
        <p style="margin-top:24px;text-align:center;">
          <a href="${process.env.FRONTEND_URL || "http://localhost:5174"}/portal/connections" style="display:inline-block;padding:12px 18px;background:#0284c7;color:#ffffff;text-decoration:none;border-radius:8px;">
            View Connection Requests
          </a>
        </p>
        <p style="color:#6b7280;font-size:14px;margin-top:24px;">This is an automated message from the Alumni Network ${labels.portalName}.</p>
      </div>
    `
  });

  return {
    delivered: true,
    mode: "smtp",
    message: "Connection request email sent successfully.",
    previewUrl: nodemailer.getTestMessageUrl(info) || null
  };
}
export async function sendPasswordResetEmail({
  to,
  recipientName,
  resetUrl,
  expiresIn = "1 hour",
  institutionType = "college"
}) {
  const config = getEmailConfig();
  const name = recipientName || "there";
  const labels = getInstitutionEmailLabels(institutionType);

  if (!hasSmtpConfig(config)) {
    console.log("SMTP not configured. Password reset email was not sent.");
    console.log(`Recipient: ${to}`);
    console.log(`Reset link: ${resetUrl}`);
    return { delivered: false, mode: "log" };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass }
  });

  await transporter.sendMail({
    from: config.from,
    to,
    subject: "Reset your password",
    html: `
      <div style="font-family: Arial, sans-serif; color: #14213d; line-height: 1.6;">
        <h2>Password Reset Request</h2>
        <p>Hello ${name},</p>
        <p>You requested to reset your password. Click the button below to set a new password:</p>
        <p>
          <a
            href="${resetUrl}"
            style="display:inline-block;padding:12px 18px;background:#14213d;color:#ffffff;text-decoration:none;border-radius:8px;"
          >
            Reset Password
          </a>
        </p>
        <p>If the button does not work, use this link:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link expires in ${expiresIn}.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `
  });

  return { delivered: true, mode: "smtp" };
}

export async function sendRoleDelegationEmail({
  to,
  recipientName,
  instituteName,
  action,           // 'granted' | 'revoked'
  permissions = [],
  expiresAt = null,
  institutionType = "college",
}) {
  const config = getEmailConfig();
  const name = recipientName || "there";
  const labels = getInstitutionEmailLabels(institutionType);
  const portalUrl = process.env.CLIENT_URL || "http://localhost:5173";

  if (!hasSmtpConfig(config)) {
    console.log(`[RoleDelegation] SMTP not configured — ${action} email not sent to ${to}.`);
    return { delivered: false, mode: "log", message: "SMTP not configured." };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });

  const permissionRows = permissions
    .map(p => `<li style="margin:4px 0;">${p.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</li>`)
    .join("");

  const expiryLine = expiresAt
    ? `<p>This access <strong>expires on ${new Date(expiresAt).toLocaleString()}</strong>.</p>`
    : "";

  const isGrant = action === "granted";

  const subject = isGrant
    ? `You have been given co-admin access to the ${instituteName} ${labels.portalName}`
    : `Your co-admin access to the ${instituteName} ${labels.portalName} has been removed`;

  const html = isGrant ? `
    <div style="font-family:Arial,sans-serif;color:#14213d;line-height:1.6;max-width:600px;">
      <h2>Co-Admin Access Granted</h2>
      <p>Hello ${name},</p>
      <p>
        You have been granted <strong>co-admin access</strong> to the
        <strong>${instituteName}</strong> ${labels.portalName}.
      </p>
      <p>You can now perform the following actions:</p>
      <ul style="padding-left:20px;">${permissionRows}</ul>
      ${expiryLine}
      <p style="margin-top:20px;">
        <a href="${portalUrl}/portal"
           style="display:inline-block;padding:12px 18px;background:#6366f1;color:#fff;
                  text-decoration:none;border-radius:8px;">
          Go to Portal
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px;">
        If you were not expecting this, please contact the institute administrator.
      </p>
    </div>
  ` : `
    <div style="font-family:Arial,sans-serif;color:#14213d;line-height:1.6;max-width:600px;">
      <h2>Co-Admin Access Removed</h2>
      <p>Hello ${name},</p>
      <p>
        Your co-admin access to the <strong>${instituteName}</strong> ${labels.portalName}
        has been <strong>removed</strong>.
      </p>
      <p>You continue to have regular alumni access to the portal.</p>
      <p style="margin-top:20px;">
        <a href="${portalUrl}/portal"
           style="display:inline-block;padding:12px 18px;background:#6366f1;color:#fff;
                  text-decoration:none;border-radius:8px;">
          Go to Portal
        </a>
      </p>
    </div>
  `;

  const info = await transporter.sendMail({ from: config.from, to, subject, html });
  return {
    delivered: true,
    mode: "smtp",
    message: `Role delegation ${action} email sent.`,
    previewUrl: nodemailer.getTestMessageUrl(info) || null,
  };
}

export async function sendCampaignEmail({
  to,
  recipientName,
  subject,
  htmlContent,
  instituteName
}) {
  const config = getEmailConfig();

  if (!hasSmtpConfig(config)) {
    console.log(`[Campaign] SMTP not configured. Email to ${to} skipped.`);
    return { delivered: false, mode: "log" };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });

  const name = recipientName || "there";

  const html = `
    <div style="font-family: Arial, sans-serif; color: #14213d; line-height: 1.6; max-width: 600px; margin: 0 auto;">
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0; color: #14213d;">${subject}</h2>
        <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">From ${instituteName}</p>
      </div>
      <div>
        <p>Hello ${name},</p>
        ${htmlContent}
      </div>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; text-align: center;">
        <p>You are receiving this email because you are registered on the ${instituteName} Alumni Portal.</p>
        <p>Please do not reply directly to this automated email.</p>
      </div>
    </div>
  `;

  const info = await transporter.sendMail({ from: config.from, to, subject, html });
  return {
    delivered: true,
    mode: "smtp",
  };
}
