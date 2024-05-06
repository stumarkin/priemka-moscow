<?php

// Yookassa Request format:
// {
//     "type" : "notification",
//     "event" : "payment.succeeded",
//     "object" : {
//       "id" : "2c083fff-000f-5000-8000-1d9bf6eeebdd",
//       "status" : "succeeded",
//       "amount" : {
//         "value" : "4490.00",
//         "currency" : "RUB"
//       },
//       "income_amount" : {
//         "value" : "4332.85",
//         "currency" : "RUB"
//       },
//       "description" : "#42 Pro-тариф на 180 дней за 4 190₽ (скидка 30%)",
//       "recipient" : {
//         "account_id" : "323786",
//         "gateway_id" : "2082375"
//       },
//       "payment_method" : {
//         "type" : "bank_card",
//         "id" : "2c083fff-000f-5000-8000-1d9bf6eeebdd",
//         "saved" : false,
//         "title" : "Bank card *4444",
//         "card" : {
//           "first6" : "555555",
//           "last4" : "4444",
//           "expiry_year" : "2033",
//           "expiry_month" : "12",
//           "card_type" : "MasterCard",
//           "issuer_country" : "US"
//         }
//       },
//       "captured_at" : "2023-05-30T19:54:53.765Z",
//       "created_at" : "2023-05-30T17:02:55.836Z",
//       "test" : true,
//       "refunded_amount" : {
//         "value" : "0.00",
//         "currency" : "RUB"
//       },
//       "paid" : true,
//       "refundable" : true,
//       "metadata" : {
//         "billing_id" : "42"
//       },
//       "authorization_details" : {
//         "rrn" : "633832796627863",
//         "auth_code" : "787085",
//         "three_d_secure" : {
//           "applied" : false,
//           "method_completed" : false,
//           "challenge_completed" : false
//         }
//       }
//     }

function getDateTimeNow ($format = 'Y-m-d\TH:i:s.u'){
    $d = new DateTime('NOW');
    return $d->format($format);
}

function debuglog ($key, $value){
    $value = ( (substr($value, 0, 1) == '{') ? $value : '"'.$value.'"');
    $strLog = '"'.getDateTimeNow().'": {"session": "'.md5($_SERVER["REQUEST_TIME_FLOAT"]).'", "exec_time": "'.round( (microtime(true) - $_SERVER["REQUEST_TIME_FLOAT"]), 3).'", '.PHP_EOL
        .'"'.$key.'": '.$value.','.PHP_EOL
        .'},'.PHP_EOL;
    error_log( $strLog , 3, "log/".date("Y-m-d").".log");
}

function curlApi($params = []){
    $url = "https://priemka-pro.ru/api/v2/index.php?method=updatepayment";
    $query_params = http_build_query($params);
    $ch = curl_init(); 
    curl_setopt($ch,CURLOPT_URL, $url);
    curl_setopt($ch,CURLOPT_POST, true);
    curl_setopt($ch,CURLOPT_POSTFIELDS, $query_params);
    curl_setopt($ch,CURLOPT_RETURNTRANSFER, true); 

    $result = curl_exec($ch);
    debuglog ("api_query_result", $result);
    return $result;
}

$inputJSON = file_get_contents('php://input');
if (strlen($inputJSON)==0){
    debuglog('yookassa', 'Empty input, 404 thrown');
    http_response_code(404);
    die();
}

$input = json_decode($inputJSON);
debuglog('yookassa.'.$input->{'type'}.'.'.$input->{'event'}, $inputJSON);

$params = array( 
    'id' => $input->{'object'}->{'metadata'}->{'billing_id'},
    'deviceid' => $input->{'object'}->{'metadata'}->{'deviceid'},
    'paid' => $input->{'object'}->{'paid'},
    'status' => $input->{'object'}->{'status'},
    'provider_id' => $input->{'object'}->{'id'},
);

curlApi($params);
?>