<?php
// commissions/statement.php — Printable Commission Statement
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_login();
require_role('admin', 'staff', 'finance_manager');

$commissionId = (int)($_GET['id'] ?? 0);

if (!$commissionId) {
    die("Invalid Commission ID.");
}

$c = db_fetch_one($conn, "
    SELECT c.*, l.lead_id as lead_str_id, l.customer_name, l.loan_amount,
           l.vehicle_make_model, l.registration_number,
           a.name as agent_name, a.mobile as agent_mobile, a.pan_number
    FROM commissions c
    JOIN leads l ON c.lead_id = l.id
    LEFT JOIN agents a ON c.agent_id = a.id
    WHERE c.id = ?
", 'i', [$commissionId]);

if (!$c) {
    die("Commission record not found.");
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Payout Statement - <?= e($c['lead_str_id']) ?></title>
    <style>
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #333;
            margin: 0;
            padding: 40px;
            background: #f8fafc;
        }
        .invoice-box {
            max-width: 800px;
            margin: auto;
            padding: 40px;
            background: #fff;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
            border-top: 6px solid #4f46e5;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #f1f5f9;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo-area h1 {
            margin: 0;
            color: #1e293b;
            font-size: 28px;
        }
        .logo-area p {
            margin: 5px 0 0;
            color: #64748b;
            font-size: 14px;
        }
        .invoice-details {
            text-align: right;
        }
        .invoice-details h2 {
            margin: 0;
            color: #4f46e5;
            font-size: 24px;
            text-transform: uppercase;
        }
        .invoice-details p {
            margin: 5px 0 0;
            color: #64748b;
            font-size: 14px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 40px;
        }
        .info-box {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
        }
        .info-box h3 {
            margin: 0 0 10px;
            color: #94a3b8;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .info-box p {
            margin: 5px 0;
            font-size: 14px;
            font-weight: 600;
        }
        .info-box span {
            font-weight: 400;
            color: #64748b;
        }
        table {
            width: 100%;
            line-height: inherit;
            text-align: left;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        table th {
            background: #f1f5f9;
            padding: 12px;
            color: #475569;
            font-size: 13px;
            text-transform: uppercase;
        }
        table td {
            padding: 12px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 15px;
        }
        table td.amount {
            text-align: right;
            font-family: monospace;
            font-weight: bold;
        }
        table th.amount {
            text-align: right;
        }
        .totals-grid {
            display: flex;
            justify-content: flex-end;
        }
        .totals-box {
            width: 350px;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 12px;
            font-size: 14px;
            border-bottom: 1px solid #f1f5f9;
        }
        .total-row.deduction {
            color: #e11d48;
        }
        .total-row.net {
            font-size: 18px;
            font-weight: bold;
            color: #4f46e5;
            background: #eef2ff;
            border: none;
            border-radius: 6px;
            margin-top: 10px;
        }
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #f1f5f9;
            text-align: center;
            color: #94a3b8;
            font-size: 12px;
        }
        .btn-print {
            display: block;
            width: 200px;
            margin: 20px auto;
            padding: 12px;
            background: #4f46e5;
            color: #fff;
            text-align: center;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            cursor: pointer;
            border: none;
        }
        .btn-print:hover {
            background: #4338ca;
        }
        @media print {
            body { padding: 0; background: #fff; }
            .invoice-box { box-shadow: none; border-top: none; padding: 0; }
            .btn-print { display: none; }
        }
    </style>
</head>
<body>

<button class="btn-print" onclick="window.print()">Print Statement</button>

<div class="invoice-box">
    <div class="header">
        <div class="logo-area">
            <h1>LeadFlow Pro</h1>
            <p>Finance & Loan Processing Services</p>
        </div>
        <div class="invoice-details">
            <h2>Payout Statement</h2>
            <p><strong>Date:</strong> <?= date('d M Y') ?></p>
            <p><strong>Month:</strong> <?= e($c['payout_month']) ?: date('F Y') ?></p>
        </div>
    </div>

    <div class="info-grid">
        <div class="info-box">
            <h3>Billed To (Channel Partner)</h3>
            <p><?= e($c['agent_name'] ?: 'Direct Source') ?></p>
            <p><span>Phone:</span> <?= e($c['agent_mobile'] ?: '—') ?></p>
            <p><span>PAN:</span> <?= e($c['pan_number'] ?: '—') ?></p>
        </div>
        <div class="info-box">
            <h3>Loan Details</h3>
            <p><span>Customer:</span> <?= e($c['customer_name']) ?></p>
            <p><span>Lead A/C:</span> <?= e($c['lead_str_id']) ?></p>
            <p><span>Vehicle:</span> <?= e($c['vehicle_make_model']) ?> (<?= e($c['registration_number']) ?>)</p>
            <p><span>Loan Amt:</span> ₹<?= number_format($c['loan_amount']) ?></p>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Description</th>
                <th class="amount">Amount</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Channel Payout (Gross)</td>
                <td class="amount">₹<?= number_format($c['gross_payout'], 2) ?></td>
            </tr>
            <?php if ($c['additional_payout'] > 0): ?>
            <tr>
                <td>Additional Incentives</td>
                <td class="amount">₹<?= number_format($c['additional_payout'], 2) ?></td>
            </tr>
            <?php endif; ?>
        </tbody>
    </table>

    <div class="totals-grid">
        <div class="totals-box">
            <div class="total-row">
                <span>Gross Total</span>
                <span style="font-family: monospace; font-weight: bold;">₹<?= number_format($c['gross_payout'] + $c['additional_payout'], 2) ?></span>
            </div>
            <div class="total-row deduction">
                <span>Less: TDS (5%)</span>
                <span style="font-family: monospace;">- ₹<?= number_format($c['tds_amount'], 2) ?></span>
            </div>
            <div class="total-row deduction">
                <span>Less: GST (18%)</span>
                <span style="font-family: monospace;">- ₹<?= number_format($c['gst_amount'], 2) ?></span>
            </div>
            <div class="total-row net">
                <span>Net Payable Received</span>
                <span>₹<?= number_format($c['net_payout'] + $c['additional_payout'], 2) ?></span>
            </div>
            
            <div style="margin-top: 20px; border-top: 2px dashed #e2e8f0; padding-top: 10px;">
                <div class="total-row">
                    <span style="color: #475569;">Channel Actual Paid</span>
                    <span style="font-family: monospace; font-weight: bold; color: #0f172a;">₹<?= number_format($c['channel_paid_amount'] + $c['additional_payout'], 2) ?></span>
                </div>
            </div>
        </div>
    </div>

    <div class="footer">
        <p>This is a computer generated statement and does not require a physical signature.</p>
        <p>Thank you for partnering with LeadFlow Pro.</p>
    </div>
</div>

</body>
</html>
