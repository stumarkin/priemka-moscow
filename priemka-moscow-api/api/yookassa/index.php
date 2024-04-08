<?php
require __DIR__ . '/sdk/lib/autoload.php'; 

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header("Access-Control-Allow-Headers: X-Requested-With");

$value = intval( $_POST['value'] );
$description = trim( $_POST['description'] );
$billing_id = trim( $_POST['billing_id'] );
$deviceid = trim( $_POST['deviceid'] );


$client = new \YooKassa\Client();
$client->setAuth('964018', 'live_F1N8MKfvhCryX8XsjFegmmCGTyQWycc8QRx_jF0udXI');

$idempotenceKey = uniqid('', true);
$response = $client->createPayment(
    array(
        'amount' => array(
            'value' => $value.'.00',
            'currency' => 'RUB',
        ),
        'metadata' => array(
            'billing_id' => $billing_id,
            'deviceid' => $deviceid,
        ),
        'payment_method_data' => array(
            'type' => 'bank_card',
        ),
        'confirmation' => array(
            'type' => 'redirect',
            'return_url' => 'https://priemka-pro.ru/webview/pro/#callback',
        ),
        'description' => $description,
        'merchant_customer_id' => $deviceid
    ),
    $idempotenceKey
);

//get confirmation url
$confirmationUrl = $response->getConfirmation()->getConfirmationUrl();

echo json_encode( ["result" => true, "confirmationUrl" => $confirmationUrl] );

?>