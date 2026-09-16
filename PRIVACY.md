# Internship Tracker privacy summary

The secure beta stores account preferences, saved applications, feedback, networking records, notification settings, and résumé files in Supabase. Row Level Security restricts private records to the signed-in user. Résumé PDFs are stored in a private bucket and extracted résumé text is visible only to the file owner.

The public GitHub Pages repository contains frontend code and public opportunity metadata only. It must never contain passwords, service-role keys, private résumé files, extracted résumé text, application notes, or networking contacts.

Users can remove individual résumé files from the résumé library. The Settings page can call the authenticated `delete-account` Edge Function to remove the account, private database records through cascading deletes, and files stored beneath the user's private storage folder.

Before public launch, configure custom SMTP, CAPTCHA, rate limits, a support contact, a full privacy policy and terms, retention periods, and incident-response procedures. The current build is a private beta, not a production hiring service.
