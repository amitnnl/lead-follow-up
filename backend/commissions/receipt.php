<?php
// commissions/receipt.php — Printable Payout Receipt
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_login();

$lead_str_id = $_GET['lead_id'] ?? '';
$comm_id = (int)($_GET['id'] ?? 0);

if (!$lead_str_id && !$comm_id) {
    die("Invalid request");
}

if ($comm_id) {
    $c = db_fetch_one($conn, "
        SELECT c.*, l.lead_id as lead_str_id, l.customer_name, l.loan_amount, l.vehicle_make_model,
               a.name as agent_name, a.mobile as agent_mobile,
               ex.name as exec_name, f.name as financer_name,
               lb.received_amount, (SELECT SUM(amount) FROM lead_deductions WHERE lead_id = l.id) as total_deductions
        FROM commissions c
        JOIN leads l ON c.lead_id = l.id
        LEFT JOIN agents a ON c.agent_id = a.id
        LEFT JOIN executives ex ON l.executive_id = ex.id
        LEFT JOIN financers f ON l.financer_id = f.id
        LEFT JOIN lead_banking lb ON lb.lead_id = l.id
        WHERE c.id = ?
    ", 'i', [$comm_id]);
} else {
    $c = db_fetch_one($conn, "
        SELECT c.*, l.lead_id as lead_str_id, l.customer_name, l.loan_amount, l.vehicle_make_model,
               a.name as agent_name, a.mobile as agent_mobile,
               ex.name as exec_name, f.name as financer_name,
               lb.received_amount, (SELECT SUM(amount) FROM lead_deductions WHERE lead_id = l.id) as total_deductions
        FROM commissions c
        JOIN leads l ON c.lead_id = l.id
        LEFT JOIN agents a ON c.agent_id = a.id
        LEFT JOIN executives ex ON l.executive_id = ex.id
        LEFT JOIN financers f ON l.financer_id = f.id
        LEFT JOIN lead_banking lb ON lb.lead_id = l.id
        WHERE l.lead_id = ?
        ORDER BY c.id DESC LIMIT 1
    ", 's', [$lead_str_id]);
}

if (!$c) {
    die("Commission record not found.");
}

$totalDeductions = (float)($c['total_deductions'] ?? 0);
$netDisbursed = (float)($c['received_amount'] ?? 0) - $totalDeductions;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Payout Receipt - <?= e($c['lead_str_id']) ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="<?php echo BASE_URL; ?>/assets/css/tailwind.css?v=<?= filemtime(__DIR__ . '/../assets/css/tailwind.css') ?>" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { background: #f1f5f9; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .receipt-container { max-width: 800px; margin: 2rem auto; background: #fff; padding: 3rem; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        @media print {
            body { background: #fff; }
            .receipt-container { box-shadow: none; margin: 0; padding: 0; width: 100%; max-width: 100%; }
            .no-print { display: none !important; }
        }
        .dotted-border { border-bottom: 2px dotted #cbd5e1; }
    </style>
</head>
<body class="text-slate-800 font-['Inter']">

    <!-- Action Bar -->
    <div class="no-print text-center py-4 bg-white border-b border-slate-200 sticky top-0 z-50 flex justify-center gap-4">
        <button onclick="window.history.back()" class="px-5 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
            &larr; Back
        </button>
        <button onclick="window.print()" class="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-colors flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            Print / Save Receipt as PDF
        </button>
        <button id="emailBtn" onclick="sendEmailReceipt(<?= $c['id'] ?>)" class="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 shadow-lg transition-colors flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            Email Receipt to Agent
        </button>
    </div>
    
    <script>
        function sendEmailReceipt(id) {
            const btn = document.getElementById('emailBtn');
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Sending...';
            btn.disabled = true;

            fetch('email_receipt.php?id=' + id)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        alert('Receipt sent successfully to ' + data.email);
                    } else {
                        alert('Error: ' + data.error);
                    }
                })
                .catch(err => alert('Network error while sending.'))
                .finally(() => {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                });
        }
    </script>

    <div class="receipt-container relative">
        <!-- Header -->
        <div class="flex justify-between items-start mb-8">
            <div>
                <div class="flex items-center gap-2 mb-2">
                    <div class="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-lg">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    </div>
                    <h1 class="text-2xl font-extrabold tracking-tight text-slate-900">LeadFlow Pro</h1>
                </div>
                <p class="text-sm text-slate-500">DSA Vehicle Finance Operations</p>
                <p class="text-xs text-slate-400 mt-1">Generated: <?= date('d M Y, h:i A') ?></p>
            </div>
            <div class="text-right">
                <h2 class="text-2xl font-black text-slate-800 uppercase tracking-widest mb-1">PAYMENT VOUCHER</h2>
                <div class="text-slate-900 font-mono font-bold">Voucher No. VCH-<?= str_pad($c['id'], 6, '0', STR_PAD_LEFT) ?></div>
            </div>
        </div>

        <!-- Customer & Lead Info -->
        <div class="grid grid-cols-2 gap-8 mb-8">
            <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Customer Details</h3>
                <div class="font-bold text-lg text-slate-800"><?= e($c['customer_name']) ?></div>
                <div class="text-sm text-slate-600 mt-1"><?= e($c['vehicle_make_model']) ?></div>
                <div class="mt-4 pt-4 border-t border-slate-200">
                    <div class="text-xs text-slate-500">Lead ID</div>
                    <div class="font-mono font-semibold text-brand-700"><?= e($c['lead_str_id']) ?></div>
                </div>
            </div>
            
            <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">DSA Partner / Agent</h3>
                <div class="font-bold text-lg text-slate-800"><?= e($c['agent_name'] ?? 'Direct Lead') ?></div>
                <div class="text-sm text-slate-600 mt-1"><?= e($c['agent_mobile'] ?? '—') ?></div>
                <div class="mt-4 pt-4 border-t border-slate-200 flex justify-between">
                    <div>
                        <div class="text-xs text-slate-500">Financer</div>
                        <div class="font-semibold text-slate-700"><?= e($c['financer_name'] ?? '—') ?></div>
                    </div>
                    <div class="text-right">
                        <div class="text-xs text-slate-500">Executive</div>
                        <div class="font-semibold text-slate-700"><?= e($c['exec_name'] ?? '—') ?></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Financial Summary -->
        <h3 class="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-4 border-b-2 border-slate-900 pb-2">Financial Breakdown</h3>
        <table class="w-full text-sm mb-8">
            <tbody>
                <tr>
                    <td class="py-3 font-medium text-slate-600">Total Sanctioned Loan Amount</td>
                    <td class="py-3 text-right font-mono font-bold text-slate-800"><?= format_currency((float)$c['loan_amount']) ?></td>
                </tr>
                <tr>
                    <td class="py-3 font-medium text-slate-600">Bank Disbursement Received</td>
                    <td class="py-3 text-right font-mono font-bold text-slate-800"><?= format_currency((float)($c['received_amount'] ?? 0)) ?></td>
                </tr>
                <?php if ($totalDeductions > 0): ?>
                <tr>
                    <td class="py-3 font-medium text-rose-500 pl-4">Less: Operational Deductions</td>
                    <td class="py-3 text-right font-mono font-semibold text-rose-500">- <?= format_currency($totalDeductions) ?></td>
                </tr>
                <?php endif; ?>
                <tr class="bg-slate-50">
                    <td class="py-4 px-4 font-bold text-slate-900 rounded-l-lg">Net Amount After Deductions</td>
                    <td class="py-4 px-4 text-right font-mono font-black text-lg text-slate-900 rounded-r-lg"><?= format_currency($netDisbursed) ?></td>
                </tr>
            </tbody>
        </table>

        <!-- Commission Payouts -->
        <h3 class="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-4 border-b-2 border-slate-200 pb-2">Agent Commission Payout</h3>
        <table class="w-full text-sm mb-8">
            <thead>
                <tr class="text-left text-xs text-slate-500 uppercase tracking-wider">
                    <th class="pb-3">Payout Type</th>
                    <th class="pb-3">Status</th>
                    <th class="pb-3">Date / Mode</th>
                    <th class="pb-3 text-right">Amount</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
                <tr>
                    <td class="py-3 font-medium">90% Initial Split</td>
                    <td class="py-3">
                        <?php if (($c['payout_90_status'] ?? 'pending') === 'paid'): ?>
                            <span class="text-emerald-600 font-bold">✓ Paid</span>
                        <?php else: ?>
                            <span class="text-amber-500 font-bold">Pending</span>
                        <?php endif; ?>
                    </td>
                    <td class="py-3 text-slate-500">
                        <?= $c['payout_90_date'] ? date('d M Y', strtotime($c['payout_90_date'])) : '—' ?>
                        <?= $c['payout_90_mode'] ? '<br><span class="text-xs uppercase">' . $c['payout_90_mode'] . '</span>' : '' ?>
                    </td>
                    <td class="py-3 text-right font-mono font-semibold text-slate-700"><?= format_currency((float)$c['commission_amount'] * 0.90) ?></td>
                </tr>
                <tr>
                    <td class="py-3 font-medium">10% Retention Split</td>
                    <td class="py-3">
                        <?php if (($c['payout_10_status'] ?? 'pending') === 'paid'): ?>
                            <span class="text-emerald-600 font-bold">✓ Paid</span>
                        <?php else: ?>
                            <span class="text-slate-400 font-bold">Held</span>
                        <?php endif; ?>
                    </td>
                    <td class="py-3 text-slate-500">
                        <?= $c['payout_10_date'] ? date('d M Y', strtotime($c['payout_10_date'])) : '—' ?>
                        <?= $c['payout_10_mode'] ? '<br><span class="text-xs uppercase">' . $c['payout_10_mode'] . '</span>' : '' ?>
                    </td>
                    <td class="py-3 text-right font-mono font-semibold text-slate-700"><?= format_currency((float)$c['commission_amount'] * 0.10) ?></td>
                </tr>
                <?php if ((float)$c['additional_payout'] > 0): ?>
                <tr>
                    <td class="py-3 font-medium text-brand-600">Additional Incentives</td>
                    <td class="py-3"><span class="text-emerald-600 font-bold">✓ Applied</span></td>
                    <td class="py-3 text-slate-500">—</td>
                    <td class="py-3 text-right font-mono font-semibold text-brand-600"><?= format_currency((float)$c['additional_payout']) ?></td>
                </tr>
                <?php endif; ?>
                <tr>
                    <td colspan="3" class="py-4 text-right font-bold text-slate-800">Total Commission Paid:</td>
                    <td class="py-4 text-right font-mono font-black text-lg text-emerald-600"><?= format_currency((float)$c['paid_amount']) ?></td>
                </tr>
            </tbody>
        </table>

        <!-- Footer Notes -->
        <?php if (!empty($c['notes'])): ?>
        <div class="mb-8 p-4 rounded-xl bg-yellow-50/50 border border-yellow-100 text-yellow-800 text-sm">
            <span class="font-bold block mb-1">Remarks / Transaction Notes:</span>
            <?= nl2br(e($c['notes'])) ?>
        </div>
        <?php endif; ?>

        <!-- Signatures -->
        <div class="mt-16 flex justify-between px-8 text-center text-sm font-bold text-slate-800">
            <div>
                <div class="w-48 dotted-border mb-2"></div>
                <div>Authorized Signatory</div>
            </div>
            <div>
                <div class="w-48 dotted-border mb-2"></div>
                <div>Receiver's Signature</div>
            </div>
        </div>

    </div>
</body>
</html>
