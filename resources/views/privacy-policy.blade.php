<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy - DiaChat</title>
    <meta name="description" content="Official Privacy Policy for DiaChat mobile and web messaging application. Compliant with Google Play Store and Apple App Store requirements.">
    <link rel="icon" type="image/png" href="/launcher.png">
    <link rel="apple-touch-icon" href="/launcher.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-body: #0b0f19;
            --bg-card: #111827;
            --bg-card-hover: #1f2937;
            --bg-accent: rgba(59, 130, 246, 0.1);
            --border: #1e293b;
            --border-highlight: #3b82f6;
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --text-muted: #64748b;
            --primary: #3b82f6;
            --primary-hover: #2563eb;
            --accent-green: #10b981;
            --accent-purple: #8b5cf6;
            --accent-amber: #f59e0b;
            --accent-red: #ef4444;
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
            line-height: 1.7;
            -webkit-font-smoothing: antialiased;
        }

        /* Glass Header */
        header {
            position: sticky;
            top: 0;
            z-index: 50;
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            background: rgba(11, 15, 25, 0.85);
            border-bottom: 1px solid var(--border);
            padding: 16px 24px;
        }

        .header-container {
            max-width: 1200px;
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
            width: 38px;
            height: 38px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .brand-text {
            display: flex;
            flex-direction: column;
        }

        .brand-name {
            font-size: 1.25rem;
            font-weight: 800;
            letter-spacing: -0.02em;
            background: linear-gradient(135deg, #ffffff 0%, #93c5fd 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .brand-sub {
            font-size: 0.75rem;
            color: var(--text-secondary);
            font-weight: 500;
        }

        .header-actions {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .btn-header {
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.2s ease;
        }

        .btn-primary {
            background: var(--primary);
            color: #ffffff;
            box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
        }

        .btn-primary:hover {
            background: var(--primary-hover);
            transform: translateY(-1px);
        }

        .btn-outline {
            border: 1px solid var(--border);
            color: var(--text-secondary);
            background: transparent;
        }

        .btn-outline:hover {
            border-color: var(--primary);
            color: var(--text-primary);
        }

        /* Hero Banner */
        .hero {
            padding: 60px 24px 40px;
            max-width: 1200px;
            margin: 0 auto;
            text-align: center;
        }

        .hero-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 14px;
            background: rgba(16, 185, 129, 0.12);
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: 9999px;
            font-size: 0.8125rem;
            color: var(--accent-green);
            font-weight: 600;
            margin-bottom: 20px;
        }

        .hero h1 {
            font-size: 2.75rem;
            font-weight: 800;
            letter-spacing: -0.03em;
            margin-bottom: 16px;
            line-height: 1.2;
        }

        .hero p {
            font-size: 1.125rem;
            color: var(--text-secondary);
            max-width: 720px;
            margin: 0 auto 24px;
        }

        .meta-chips {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 12px;
            font-size: 0.8125rem;
            color: var(--text-muted);
        }

        .meta-chip {
            background: var(--bg-card);
            border: 1px solid var(--border);
            padding: 6px 12px;
            border-radius: 6px;
        }

        /* Layout Container */
        .content-container {
            max-width: 1200px;
            margin: 0 auto 80px;
            padding: 0 24px;
            display: grid;
            grid-template-columns: 280px 1fr;
            gap: 40px;
            align-items: start;
        }

        /* Sidebar Navigation */
        .sidebar {
            position: sticky;
            top: 90px;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 20px;
            max-height: calc(100vh - 120px);
            overflow-y: auto;
        }

        .sidebar-title {
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--text-muted);
            margin-bottom: 12px;
        }

        .toc-list {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .toc-link {
            display: block;
            padding: 8px 12px;
            font-size: 0.875rem;
            color: var(--text-secondary);
            text-decoration: none;
            border-radius: 6px;
            transition: all 0.15s ease;
        }

        .toc-link:hover {
            color: var(--text-primary);
            background: var(--bg-card-hover);
        }

        /* Main Content */
        .main-article {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 40px;
        }

        .section-block {
            margin-bottom: 48px;
            scroll-margin-top: 100px;
        }

        .section-block:last-child {
            margin-bottom: 0;
        }

        .section-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 18px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--border);
        }

        .section-num {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 8px;
            background: var(--bg-accent);
            color: var(--primary);
            font-weight: 700;
            font-size: 0.875rem;
            flex-shrink: 0;
        }

        .section-header h2 {
            font-size: 1.5rem;
            font-weight: 700;
            letter-spacing: -0.02em;
            color: var(--text-primary);
        }

        .section-block p {
            color: var(--text-secondary);
            margin-bottom: 16px;
            font-size: 0.95rem;
        }

        .section-block ul {
            list-style: none;
            padding-left: 0;
            margin-bottom: 18px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .section-block li {
            position: relative;
            padding-left: 24px;
            color: var(--text-secondary);
            font-size: 0.9375rem;
        }

        .section-block li::before {
            content: "•";
            position: absolute;
            left: 8px;
            color: var(--primary);
            font-weight: bold;
            font-size: 1.2rem;
            line-height: 1;
        }

        .highlight-box {
            background: rgba(30, 41, 59, 0.6);
            border-left: 4px solid var(--primary);
            border-radius: 0 10px 10px 0;
            padding: 16px 20px;
            margin: 20px 0;
        }

        .highlight-box.danger {
            border-left-color: var(--accent-red);
            background: rgba(239, 68, 68, 0.08);
        }

        .highlight-box.success {
            border-left-color: var(--accent-green);
            background: rgba(16, 185, 129, 0.08);
        }

        .highlight-box h4 {
            color: var(--text-primary);
            font-size: 0.95rem;
            font-weight: 700;
            margin-bottom: 6px;
        }

        .highlight-box p {
            font-size: 0.875rem;
            margin-bottom: 0;
        }

        /* Permission Cards Grid */
        .grid-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
            gap: 16px;
            margin: 20px 0;
        }

        .card {
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 20px;
            transition: border-color 0.2s;
        }

        .card:hover {
            border-color: var(--primary);
        }

        .card-icon {
            font-size: 1.5rem;
            margin-bottom: 12px;
        }

        .card h3 {
            font-size: 1rem;
            font-weight: 700;
            margin-bottom: 8px;
            color: var(--text-primary);
        }

        .card p {
            font-size: 0.875rem;
            color: var(--text-muted);
            margin-bottom: 0;
        }

        .code-pill {
            display: inline-block;
            font-family: 'JetBrains Mono', monospace;
            background: rgba(255, 255, 255, 0.08);
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            color: #93c5fd;
            margin-top: 8px;
        }

        /* Action banner */
        .deletion-cta {
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(185, 28, 28, 0.05) 100%);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .deletion-cta h3 {
            color: #fca5a5;
            font-size: 1.15rem;
            font-weight: 700;
        }

        .deletion-cta p {
            margin-bottom: 0;
            color: #cbd5e1;
            font-size: 0.9rem;
        }

        .btn-delete {
            align-self: flex-start;
            background: var(--accent-red);
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 700;
            font-size: 0.875rem;
            transition: all 0.2s;
        }

        .btn-delete:hover {
            background: #dc2626;
            box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);
        }

        /* Footer */
        footer {
            border-top: 1px solid var(--border);
            padding: 32px 24px;
            background: #070a11;
            text-align: center;
            color: var(--text-muted);
            font-size: 0.875rem;
        }

        footer a {
            color: var(--primary);
            text-decoration: none;
        }

        footer a:hover {
            text-decoration: underline;
        }

        @media (max-width: 900px) {
            .content-container {
                grid-template-columns: 1fr;
            }
            .sidebar {
                display: none;
            }
            .hero h1 {
                font-size: 2rem;
            }
            .main-article {
                padding: 24px 18px;
            }
        }
    </style>
</head>
<body>

    <!-- Header -->
    <header>
        <div class="header-container">
            <a href="/" class="brand">
                <img src="/launcher.png" alt="DiaChat Logo" onerror="this.src='https://api.iconify.design/heroicons:chat-bubble-left-right-solid.svg?color=%233b82f6'">
                <div class="brand-text">
                    <span class="brand-name">DiaChat</span>
                    <span class="brand-sub">Privacy & Security Center</span>
                </div>
            </a>
            <div class="header-actions">
                <a href="/delete-account" class="btn-header btn-outline">Account Deletion</a>
                <a href="mailto:support@ersila.com" class="btn-header btn-primary">Contact Support</a>
            </div>
        </div>
    </header>

    <!-- Hero -->
    <section class="hero">
        <div class="hero-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            Google Play & Apple App Store Compliant
        </div>
        <h1>DiaChat Privacy Policy</h1>
        <p>Your privacy and the security of your confidential conversations are our highest priorities. Learn how DiaChat collects, handles, protects, and gives you total control over your personal data.</p>
        
        <div class="meta-chips">
            <div class="meta-chip"><strong>Application:</strong> DiaChat (Mobile & Web)</div>
            <div class="meta-chip"><strong>Package / Bundle ID:</strong> com.nbs.diachat</div>
            <div class="meta-chip"><strong>Effective Date:</strong> October 2026</div>
            <div class="meta-chip"><strong>Status:</strong> Active & Binding</div>
        </div>
    </section>

    <!-- Main Container -->
    <div class="content-container">
        
        <!-- Sidebar Navigation -->
        <aside class="sidebar">
            <div class="sidebar-title">Table of Contents</div>
            <ul class="toc-list">
                <li><a href="#introduction" class="toc-link">1. Overview & Scope</a></li>
                <li><a href="#data-collected" class="toc-link">2. Data We Collect</a></li>
                <li><a href="#permissions" class="toc-link">3. Device Permissions</a></li>
                <li><a href="#how-we-use" class="toc-link">4. Purpose of Processing</a></li>
                <li><a href="#third-party" class="toc-link">5. Data Sharing & Third Parties</a></li>
                <li><a href="#security" class="toc-link">6. Data Security & Storage</a></li>
                <li><a href="#retention" class="toc-link">7. Data Retention Policy</a></li>
                <li><a href="#account-deletion" class="toc-link">8. Account & Data Deletion</a></li>
                <li><a href="#children" class="toc-link">9. Children's Privacy (COPPA)</a></li>
                <li><a href="#user-rights" class="toc-link">10. Your Privacy Rights</a></li>
                <li><a href="#changes" class="toc-link">11. Policy Updates</a></li>
                <li><a href="#contact" class="toc-link">12. Contact Information</a></li>
            </ul>
        </aside>

        <!-- Main Body -->
        <main class="main-article">
            
            <!-- 1. Introduction -->
            <section id="introduction" class="section-block">
                <div class="section-header">
                    <span class="section-num">1</span>
                    <h2>Overview & Scope</h2>
                </div>
                <p>Welcome to <strong>DiaChat</strong> ("we", "us", "our", or the "Application"). This Privacy Policy applies to the DiaChat mobile applications distributed on the Google Play Store and Apple App Store (Application ID: <code>com.nbs.diachat</code>), as well as the associated web client and backend services hosted at <code>test.ersila.com</code>.</p>
                <p>This policy details how we collect, store, transmit, use, and protect your information when you access or interact with DiaChat. We are committed to transparency and adherence to international data privacy regulations, including the General Data Protection Regulation (GDPR), California Consumer Privacy Act (CCPA), Apple App Store Review Guidelines (specifically Guideline 5.1.1 on Data Collection and Storage and 5.1.1(v) on Account Deletion), and the Google Play User Data Policy.</p>
            </section>

            <!-- 2. Data We Collect -->
            <section id="data-collected" class="section-block">
                <div class="section-header">
                    <span class="section-num">2</span>
                    <h2>Types of Data We Collect</h2>
                </div>
                <p>To provide high-quality, real-time messaging, audio transmission, and secure team collaboration, DiaChat collects the following categories of data:</p>
                
                <ul>
                    <li><strong>Account & Profile Information:</strong> Full name, username, email address, profile photo (avatar), designated role/department, and user "About" bio.</li>
                    <li><strong>Communications & Chat Data:</strong> Direct and group chat messages, timestamp receipts (sent, delivered, read), starred messages, and emoji reactions.</li>
                    <li><strong>Media & Attachments:</strong> Images, audio voice notes, recorded video messages, and document files voluntarily uploaded and sent through conversations.</li>
                    <li><strong>Device & Hardware Identifiers:</strong> Unique device identifier (UUID), hardware model, operating system and version, device brand/name, and network IP address.</li>
                    <li><strong>Push Notification Tokens:</strong> Firebase Cloud Messaging (FCM) tokens and Apple Push Notification service (APNs) device tokens required to alert you of new incoming messages.</li>
                    <li><strong>Security & Authentication Logs:</strong> IP address, user agent, and timestamps of login attempts to prevent brute-force attacks and unauthorized account access.</li>
                </ul>

                <div class="highlight-box success">
                    <h4>No Data Selling Guarantee</h4>
                    <p>DiaChat strictly DOES NOT sell, monetize, rent, or trade your personal data, messages, or media attachments to third-party advertisers, data brokers, or marketing networks. Never have, never will.</p>
                </div>
            </section>

            <!-- 3. Device Permissions -->
            <section id="permissions" class="section-block">
                <div class="section-header">
                    <span class="section-num">3</span>
                    <h2>Device Permissions & System Access</h2>
                </div>
                <p>When using the DiaChat mobile app, we request specific hardware and operating system permissions only when directly needed to fulfill core messaging features:</p>
                
                <div class="grid-cards">
                    <div class="card">
                        <div class="card-icon">📷</div>
                        <h3>Camera</h3>
                        <p>Allows you to take live photos and record videos within the app to share directly with your contacts.</p>
                        <span class="code-pill">android.permission.CAMERA</span>
                    </div>

                    <div class="card">
                        <div class="card-icon">🎙️</div>
                        <h3>Microphone</h3>
                        <p>Required exclusively when you choose to record audio messages or voice notes to send in chats.</p>
                        <span class="code-pill">android.permission.RECORD_AUDIO</span>
                    </div>

                    <div class="card">
                        <div class="card-icon">🖼️</div>
                        <h3>Photos & Storage</h3>
                        <p>Enables selecting images, videos, and file attachments from your device storage to send in conversations, or saving received media.</p>
                        <span class="code-pill">READ_MEDIA_IMAGES / STORAGE</span>
                    </div>

                    <div class="card">
                        <div class="card-icon">🔔</div>
                        <h3>Push Notifications</h3>
                        <p>Delivers real-time notifications for incoming messages, group mentions, and friend requests when the app is in the background.</p>
                        <span class="code-pill">POST_NOTIFICATIONS</span>
                    </div>
                </div>
                <p>You can adjust, enable, or revoke these permissions at any time through your device operating system settings (iOS Settings > DiaChat, or Android Settings > Apps > DiaChat > Permissions).</p>
            </section>

            <!-- 4. Purpose of Processing -->
            <section id="how-we-use" class="section-block">
                <div class="section-header">
                    <span class="section-num">4</span>
                    <h2>Purpose of Processing</h2>
                </div>
                <p>We process the collected data strictly for the following operational and security reasons:</p>
                <ul>
                    <li>To deliver real-time direct and group messages, reactions, voice notes, and media sharing.</li>
                    <li>To authenticate your identity and protect your account using One-Time Password (OTP) multi-factor verification.</li>
                    <li>To dispatch push notifications to your verified registered devices.</li>
                    <li>To maintain synchronization between your mobile app and web browser sessions.</li>
                    <li>To detect and prevent fraudulent access, spam, and abuse.</li>
                    <li>To provide customer support and troubleshoot technical anomalies.</li>
                </ul>
            </section>

            <!-- 5. Third-Party Sharing -->
            <section id="third-party" class="section-block">
                <div class="section-header">
                    <span class="section-num">5</span>
                    <h2>Data Sharing & Third-Party Service Providers</h2>
                </div>
                <p>We do not share your private conversations or personal data except with verified infrastructure partners who operate under strict confidentiality agreements:</p>
                <ul>
                    <li><strong>Apple Push Notification service (APNs):</strong> Provided by Apple Inc. for transmitting encrypted push notification payloads to iOS devices.</li>
                    <li><strong>Firebase Cloud Messaging (FCM):</strong> Provided by Google LLC for transmitting real-time push alerts to Android devices.</li>
                    <li><strong>Cloud & Server Infrastructure:</strong> Securely managed dedicated servers with isolated MariaDB databases located in enterprise data centers.</li>
                </ul>
                <p>We do not incorporate third-party advertising tracking SDKs, social media tracking pixels, or third-party behavioral analytics tools.</p>
            </section>

            <!-- 6. Security -->
            <section id="security" class="section-block">
                <div class="section-header">
                    <span class="section-num">6</span>
                    <h2>Data Security & Encryption</h2>
                </div>
                <p>We implement state-of-the-art technological and organizational security measures to protect your information:</p>
                <ul>
                    <li><strong>Encryption in Transit:</strong> All communications between the mobile app, web dashboard, and server endpoints are protected using Transport Layer Security (TLS 1.2 / TLS 1.3 / HTTPS) and secure WebSockets (WSS).</li>
                    <li><strong>Password Security:</strong> User passwords are never stored in plaintext; they are hashed using the robust, salted BCrypt cryptographic algorithm with standard work factors.</li>
                    <li><strong>Authentication Tokens:</strong> Session tokens are generated securely via cryptographically random keys and managed through Laravel Sanctum bearer tokens.</li>
                    <li><strong>Access Restrictions:</strong> Database access is strictly confined to authenticated services with rigorous firewall rules and continuous security logging.</li>
                </ul>
            </section>

            <!-- 7. Retention -->
            <section id="retention" class="section-block">
                <div class="section-header">
                    <span class="section-num">7</span>
                    <h2>Data Retention Policy</h2>
                </div>
                <p>We retain your profile data and chat history only for as long as your account remains active and registered on DiaChat. When you delete a message, conversation, or file, it is soft-deleted and permanently scheduled for purge according to our data lifecycle schedule. If you request account deletion, all personal data is permanently wiped from active databases as described below.</p>
            </section>

            <!-- 8. Account Deletion (Google Play & Apple Requirement) -->
            <section id="account-deletion" class="section-block">
                <div class="section-header">
                    <span class="section-num">8</span>
                    <h2>Account & Data Deletion (User Control)</h2>
                </div>
                <p>In accordance with <strong>Apple App Store Guideline 5.1.1(v)</strong> and <strong>Google Play User Data Deletion Policy</strong>, DiaChat empowers users with direct and unconditional control over the permanent deletion of their account and all associated data.</p>
                
                <p>You can execute or initiate account deletion via two seamless methods:</p>

                <div class="grid-cards">
                    <div class="card">
                        <h3>Method 1: Inside the DiaChat App</h3>
                        <p>1. Open the DiaChat mobile application.<br>
                        2. Tap on <strong>Profile / Settings</strong> (gear icon).<br>
                        3. Scroll down to <strong>Account Actions</strong>.<br>
                        4. Tap <strong>Delete Account</strong> and confirm.</p>
                    </div>

                    <div class="card">
                        <h3>Method 2: Web-Based Deletion Request</h3>
                        <p>If you uninstalled the app or cannot access your phone, you can request immediate account deletion directly through our web portal without reinstalling.</p>
                        <a href="/delete-account" class="btn-delete" style="display:inline-block; margin-top:12px;">Go to Web Deletion Portal</a>
                    </div>
                </div>

                <div class="deletion-cta">
                    <h3>What happens when your account is deleted?</h3>
                    <p>• Your profile, username, email address, and avatar are immediately purged and anonymized.<br>
                    • All registered devices, hardware identifiers, and push notification tokens are revoked and deleted.<br>
                    • Active sessions and API tokens are instantly invalidated across all devices.<br>
                    • Your message history and shared media attachments are removed from active chat directories.</p>
                </div>
            </section>

            <!-- 9. Children's Privacy -->
            <section id="children" class="section-block">
                <div class="section-header">
                    <span class="section-num">9</span>
                    <h2>Children's Privacy (COPPA Compliance)</h2>
                </div>
                <p>DiaChat is designed for general audiences and workplace communication. We do not knowingly collect, solicit, or maintain personal information from children under the age of 13 (or under 16 in the European Union / EEA). If we learn that personal data of a minor has been collected without verified parental consent, we will take immediate steps to delete that information. Parents or guardians who believe their child has created an account may contact us at <a href="mailto:support@ersila.com" style="color:var(--primary);">support@ersila.com</a> for prompt removal.</p>
            </section>

            <!-- 10. User Rights -->
            <section id="user-rights" class="section-block">
                <div class="section-header">
                    <span class="section-num">10</span>
                    <h2>Your Privacy Rights (GDPR & CCPA)</h2>
                </div>
                <p>Depending on your jurisdiction, you possess the following statutory rights regarding your personal information:</p>
                <ul>
                    <li><strong>Right to Access:</strong> You can request a copy of the personal information we hold about you.</li>
                    <li><strong>Right to Rectification:</strong> You can edit and update your name, email, avatar, and profile information directly in the app.</li>
                    <li><strong>Right to Erasure ("Right to be Forgotten"):</strong> You have the right to request full permanent erasure of your account and personal data.</li>
                    <li><strong>Right to Restrict or Object:</strong> You can configure in-app privacy controls (such as last-seen visibility, blocking contacts, and muting notifications).</li>
                    <li><strong>Right to Data Portability:</strong> You can request an export of your personal conversation records and account data.</li>
                </ul>
            </section>

            <!-- 11. Changes -->
            <section id="changes" class="section-block">
                <div class="section-header">
                    <span class="section-num">11</span>
                    <h2>Modifications to this Policy</h2>
                </div>
                <p>We may revise this Privacy Policy periodically to reflect enhancements to our service, new regulatory standards, or app store policy updates. When significant changes occur, we will update the "Effective Date" at the top of this page and post an in-app notice. We encourage you to review this policy periodically.</p>
            </section>

            <!-- 12. Contact -->
            <section id="contact" class="section-block">
                <div class="section-header">
                    <span class="section-num">12</span>
                    <h2>Contact Information</h2>
                </div>
                <p>If you have questions, comments, or data deletion inquiries regarding this Privacy Policy or DiaChat security practices, please reach out to our privacy compliance officer:</p>
                
                <div class="highlight-box">
                    <h4>DiaChat Support & Data Protection Office</h4>
                    <p><strong>Entity:</strong> DiaChat / NBS Team<br>
                    <strong>Support Email:</strong> <a href="mailto:support@ersila.com" style="color:var(--primary);">support@ersila.com</a><br>
                    <strong>Privacy Inquiries:</strong> <a href="mailto:privacy@diachat.app" style="color:var(--primary);">privacy@diachat.app</a><br>
                    <strong>Official Domain:</strong> <a href="https://test.ersila.com" target="_blank" style="color:var(--primary);">https://test.ersila.com</a></p>
                </div>
            </section>

        </main>
    </div>

    <!-- Footer -->
    <footer>
        <p>&copy; 2026 DiaChat. All rights reserved. | <a href="/privacy-policy">Privacy Policy</a> | <a href="/delete-account">Account Deletion</a> | <a href="mailto:support@ersila.com">Support</a></p>
    </footer>

</body>
</html>
