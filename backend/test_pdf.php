<?php
require_once __DIR__ . '/vendor/autoload.php';
use setasign\Fpdi\Fpdi;
$pdf = new Fpdi();
$pdf->AddPage();
$pdf->SetFont('Arial', 'B', 16);
$pdf->Cell(40, 10, 'Hello World!');
$pdf->Output('F', __DIR__ . '/uploads/test.pdf');
echo "PDF Created\n";
