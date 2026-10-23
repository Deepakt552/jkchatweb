<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Deletion Request - DiaChat</title>
    <meta name="description" content="Submit a request to permanently delete your DiaChat account and associated personal data. Required by Google Play & Apple App Store.">
    <link rel="icon" type="image/png" href="/launcher.png">
    <link rel="apple-touch-icon" href="/launcher.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-body: #0b0f19;
            --bg-card: #111827;
            --border: #1e293b;
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --text-muted: #64748b;
            --primary: #3b82f6;
            --accent-red: #ef4444;
            --accent-red-hover: #dc2626;
            --accent-green: #10b981;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: var(--bg-body);
            color: var(--text-primary);
            line-height: 1.6;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        header {
            border-bottom: 1px solid var(--border);
            padding: 16px 24px;
            background: rgba(11, 15, 25, 0.9);
        }

        .header-container {
            max-width: 900px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .brand {
            display: flex;
            align-items: center;
            gap: 12px;
            text-decoration: none;
            color: var(--text-primary);
        }

        .brand img {
            width: 36px;
            height: 36px;
            border-radius: 8px;
        }

        .brand-name {
            font-size: 1.25rem;
            font-weight: 800;
            background: linear-gradient(135deg, #ffffff 0%, #93c5fd 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .main-wrapper {
            max-width: 760px;
            margin: 40px auto 60px;
            padding: 0 24px;
            flex: 1;
            width: 100%;
        }

        .card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 36px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }

        .badge {
            display: inline-block;
            background: rgba(239, 68, 68, 0.12);
            color: var(--accent-red);
            font-size: 0.8125rem;
            font-weight: 700;
            padding: 4px 12px;
            border-radius: 9999px;
            margin-bottom: 16px;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }

        h1 {
            font-size: 1.875rem;
            font-weight: 800;
            margin-bottom: 12px;
            letter-spacing: -0.02em;
        }

        .lead {
            color: var(--text-secondary);
            font-size: 1rem;
            margin-bottom: 24px;
        }

        .info-box {
            background: rgba(30, 41, 59, 0.5);
            border-left: 4px solid var(--accent-red);
            border-radius: 0 8px 8px 0;
            padding: 16px;
            margin-bottom: 28px;
        }

        .info-box h3 {
            font-size: 0.95rem;
            font-weight: 700;
            margin-bottom: 6px;
            color: #fca5a5;
        }

        .info-box ul {
            padding-left: 20px;
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        .info-box li {
            margin-bottom: 4px;
        }

        .alert-success {
            background: rgba(16, 185, 129, 0.15);
            border: 1px solid rgba(16, 185, 129, 0.4);
            color: #6ee7b7;
            padding: 16px;
            border-radius: 10px;
            margin-bottom: 24px;
            font-size: 0.95rem;
            font-weight: 600;
        }

        .alert-error {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.4);
            color: #fca5a5;
            padding: 16px;
            border-radius: 10px;
            margin-bottom: 24px;
            font-size: 0.9rem;
        }

        .form-group {
            margin-bottom: 20px;
        }

        label {
            display: block;
            font-size: 0.875rem;
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--text-primary);
        }

        input[type="text"],
        input[type="email"],
        textarea {
            width: 100%;
            background: #0f172a;
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 12px 14px;
            color: var(--text-primary);
            font-size: 0.95rem;
            font-family: inherit;
            transition: border-color 0.2s;
        }

        input[type="text"]:focus,
        input[type="email"]:focus,
        textarea:focus {
            outline: none;
            border-color: var(--accent-red);
        }

        .checkbox-label {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            cursor: pointer;
            font-size: 0.875rem;
            color: var(--text-secondary);
            margin-top: 16px;
        }

        .checkbox-label input {
            margin-top: 4px;
            accent-color: var(--accent-red);
        }

        .btn-submit {
            background: var(--accent-red);
            color: #ffffff;
            border: none;
            border-radius: 8px;
            padding: 14px 24px;
            font-size: 1rem;
            font-weight: 700;
            cursor: pointer;
            width: 100%;
            transition: all 0.2s;
            margin-top: 24px;
        }

        .btn-submit:hover {
            background: var(--accent-red-hover);
            transform: translateY(-1px);
            box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);
        }

        footer {
            border-top: 1px solid var(--border);
            padding: 24px;
            text-align: center;
            font-size: 0.875rem;
            color: var(--text-muted);
            background: #070a11;
        }

        footer a {
            color: var(--primary);
            text-decoration: none;
        }

        footer a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>

    <header>
        <div class="header-container">
            <a href="/privacy-policy" class="brand">
                <img src="/launcher.png" alt="DiaChat Logo" onerror="this.src='https://api.iconify.design/heroicons:chat-bubble-left-right-solid.svg?color=%233b82f6'">
                <span class="brand-name">DiaChat</span>
            </a>
            <a href="/privacy-policy" style="color:var(--text-secondary); text-decoration:none; font-size:0.875rem;">← Back to Privacy Policy</a>
        </div>
    </header>

    <div class="main-wrapper">
        <div class="card">
            <div class="badge">Google Play & Apple Compliance</div>
            <h1>Permanent Account & Data Deletion</h1>
            <p class="lead">Submit a request to permanently delete your DiaChat account and wipe all personal data associated with your profile.</p>

            @if(session('success'))
                <div class="alert-success">
                    ✓ {{ session('success') }}
                </div>
            @endif

            @if($errors->any())
                <div class="alert-error">
                    @foreach($errors->all() as $error)
                        <div>• {{ $error }}</div>
                    @endforeach
                </div>
            @endif

            <div class="info-box">
                <h3>What will be permanently deleted:</h3>
                <ul>
                    <li>Your account profile details: Name, Username, Email address, and Avatar.</li>
                    <li>All active sessions, API authentication tokens, and login history.</li>
                    <li>All registered device identifiers, hardware UUIDs, and push notification tokens.</li>
                    <li>Your sent and received direct messages, reactions, voice notes, and media attachments.</li>
                </ul>
            </div>

            <form action="/delete-account" method="POST">
                @csrf
                <div class="form-group">
                    <label for="email_or_username">DiaChat Username or Registered Email *</label>
                    <input type="text" id="email_or_username" name="email_or_username" placeholder="e.g. john or john@example.com" value="{{ old('email_or_username') }}" required>
                </div>

                <div class="form-group">
                    <label for="reason">Reason for deletion (Optional)</label>
                    <textarea id="reason" name="reason" rows="3" placeholder="Tell us why you are leaving (optional feedback)...">{{ old('reason') }}</textarea>
                </div>

                <label class="checkbox-label">
                    <input type="checkbox" name="confirm_deletion" value="1" required>
                    <span>I understand that this action is irreversible and all my messages, media attachments, and account credentials will be permanently erased.</span>
                </label>

                <button type="submit" class="btn-submit">Submit Permanent Deletion Request</button>
            </form>
        </div>
    </div>

    <footer>
        <p>&copy; 2026 DiaChat. All rights reserved. | <a href="/privacy-policy">Privacy Policy</a> | <a href="mailto:support@ersila.com">Support: support@ersila.com</a></p>
    </footer>

</body>
</html>
