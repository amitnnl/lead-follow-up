<?php
// includes/notifications.php — WhatsApp/SMS dispatch framework

function send_notification($conn, string $type, string $phone, string $message, ?int $leadId = null, ?int $agentId = null): bool {
    if (empty($phone) || empty($message)) return false;

    // Standardize phone
    $cleanPhone = preg_replace('/\D/', '', $phone);
    if (strlen($cleanPhone) === 10) $cleanPhone = '91' . $cleanPhone;
    
    // In a real environment, we would make a cURL request to Twilio / Meta API here.
    // For now, we simulate a successful API call.
    $apiStatus = 'sent'; // 'failed' if API is down
    
    // Log to database
    $stmt = $conn->prepare("INSERT INTO notification_logs (lead_id, agent_id, recipient_phone, type, message, status) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->bind_param('iissss', $leadId, $agentId, $cleanPhone, $type, $message, $apiStatus);
    return $stmt->execute();
}

function notify_customer_disbursed($conn, int $leadId, string $customerName, string $phone, string $leadStrId) {
    $msg = "Congratulations {$customerName}! 🎊\n\nYour vehicle loan (ID: {$leadStrId}) has been successfully DISBURSED.\nThank you for choosing us!\n- LeadFlow Pro";
    send_notification($conn, 'whatsapp', $phone, $msg, $leadId, null);
}

function notify_agent_payout($conn, int $agentId, string $agentName, string $phone, float $amount, string $leadStrId) {
    $msg = "Hello {$agentName},\n\nWe have released a commission payout of ₹" . number_format($amount) . " for Loan ID {$leadStrId}. Please check your bank account.\n- LeadFlow Pro";
    send_notification($conn, 'whatsapp', $phone, $msg, null, $agentId);
}
