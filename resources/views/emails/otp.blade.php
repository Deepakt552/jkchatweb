<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>SecureChat Verification Code</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background-color: #FFFDF8;
            margin: 0;
            padding: 0;
            color: #333333;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        .card {
            background-color: #ffffff;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 12px rgba(200, 139, 55, 0.08);
            border: 1px solid #E5E5E8;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #C88B37;
            text-decoration: none;
            letter-spacing: 1px;
        }
        .title {
            font-size: 20px;
            font-weight: 600;
            margin-top: 20px;
            color: #111111;
        }
        .content {
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 30px;
            color: #555555;
        }
        .otp-container {
            text-align: center;
            margin: 30px 0;
        }
        .otp-code {
            display: inline-block;
            font-size: 36px;
            font-weight: bold;
            color: #C88B37;
            letter-spacing: 6px;
            background-color: #FFFDF8;
            padding: 15px 30px;
            border-radius: 8px;
            border: 1px dashed #C88B37;
        }
        .footer {
            text-align: center;
            font-size: 12px;
            color: #999999;
            margin-top: 30px;
            border-top: 1px solid #F1F1F4;
            padding-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="header">
                <div class="logo">🔐 SECURECHAT</div>
                <div class="title">Verification Code</div>
            </div>
            <div class="content">
                <p>Hello,</p>
                <p>You have requested to sign in to your SecureChat account. Please use the following One-Time Password (OTP) to complete your login:</p>
                <div class="otp-container">
                    <span class="otp-code">{{ $otp }}</span>
                </div>
                <p>This verification code is valid for <strong>5 minutes</strong>. If you did not request this login, please ignore this email or contact support if you believe your account security is compromised.</p>
            </div>
            <div class="footer">
                <p>&copy; {{ date('Y') }} SecureChat. All rights reserved.</p>
                <p>This is an automated security email. Please do not reply directly to this message.</p>
            </div>
        </div>
    </div>
</body>
</html>
