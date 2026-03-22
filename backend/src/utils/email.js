import nodemailer from "nodemailer";

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
  portalRoleLabel = "alumni"
}) {
  const config = getEmailConfig();
  const name = recipientName || alumniName || "there";

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
      `You have been invited to join the ${instituteName} alumni portal as ${portalRoleLabel}.`,
      `Set your password here: ${inviteUrl}`,
      `This link expires on ${new Date(expiresAt).toLocaleString()}.`,
      "",
      "If you were not expecting this invitation, you can ignore this email."
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #14213d; line-height: 1.6;">
        <h2>Welcome to ${instituteName} Alumni Portal</h2>
        <p>Hello ${name},</p>
        <p>You have been invited to join the alumni portal as ${portalRoleLabel}.</p>
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
  applicantProfile = {},
  coverLetter,
  resumeUrl,
  resumeFileName
}) {
  const config = getEmailConfig();

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
      <p><strong>Name:</strong> ${applicantName}</p>
      <p><strong>Email:</strong> <a href="mailto:${applicantEmail}">${applicantEmail}</a></p>
      ${applicantProfile.company ? `<p><strong>Company:</strong> ${applicantProfile.company}</p>` : ""}
      ${applicantProfile.designation ? `<p><strong>Position:</strong> ${applicantProfile.designation}</p>` : ""}
      ${applicantProfile.batch ? `<p><strong>Batch:</strong> ${applicantProfile.batch}</p>` : ""}
      ${applicantProfile.department ? `<p><strong>Department:</strong> ${applicantProfile.department}</p>` : ""}
      ${applicantProfile.location ? `<p><strong>Location:</strong> ${applicantProfile.location}</p>` : ""}
      ${applicantProfile.bio ? `<p><strong>Bio:</strong> ${applicantProfile.bio}</p>` : ""}
      ${applicantProfile.skills && applicantProfile.skills.length ? `<p><strong>Skills:</strong> ${applicantProfile.skills.join(", ")}</p>` : ""}
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
        <p style="color:#6b7280;font-size:14px;margin-top:24px;">This is an automated message from the Alumni Network portal.</p>
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
  requesterProfile = {},
  message
}) {
  const config = getEmailConfig();

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
      <p><strong>Name:</strong> ${requesterName}</p>
      <p><strong>Email:</strong> <a href="mailto:${requesterEmail}">${requesterEmail}</a></p>
      ${requesterProfile.company ? `<p><strong>Company:</strong> ${requesterProfile.company}</p>` : ""}
      ${requesterProfile.designation ? `<p><strong>Position:</strong> ${requesterProfile.designation}</p>` : ""}
      ${requesterProfile.batch ? `<p><strong>Batch:</strong> ${requesterProfile.batch}</p>` : ""}
      ${requesterProfile.department ? `<p><strong>Department:</strong> ${requesterProfile.department}</p>` : ""}
      ${requesterProfile.location ? `<p><strong>Location:</strong> ${requesterProfile.location}</p>` : ""}
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
        <p style="color:#6b7280;font-size:14px;margin-top:24px;">This is an automated message from the Alumni Network portal.</p>
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
