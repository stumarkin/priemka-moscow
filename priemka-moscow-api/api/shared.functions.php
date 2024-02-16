<?
/**
 * @author Sergey Tumarkin https://tumarkin.me
 */

function sqlQuery($sql) {
    $conn = new mysqli(DB_SERVERNAME, DB_USERNAME, DB_PASSWORD, DB_DBNAME);
    if ($conn->connect_error) {
        die("Connection failed: " . $conn->connect_error);
    }
    $result = $conn->query($sql);
    if ($conn->errno>0) return $conn->error;
    if ($conn->insert_id>0) return $conn->insert_id;
    $conn->close();
    return $result;
}

function getDateTimeNow ($format = 'Y-m-d\TH:i:s.u'){
    $d = new DateTime('NOW');
    return $d->format($format);
}

function escapeCharsInString ($str) {
    return str_replace(
        Array('_',  '*',  '[',  ']',  '(',  ')', '~',  '`',  '>',  '#',  '+',  '-',  '=',  '|',  '{',  '}',  '.',  '!'),
        Array('\_', '\*','\[', '\]', '\(', '\)', '\~', '\`', '\>', '\#', '\+', '\-', '\=', '\|', '\{', '\}', '\.', '\!'), 
        $str
    );
}

function tgEsc($str) { 
    return escapeCharsInString($str);
}

function botSendMessage($text, $chat_id, $parse_mode='', $inline_keyboard = false, $keyboard = false ){

    $url = "https://api.telegram.org/bot".BOT_TOKEN."/sendMessage";
    $data = array(
        'chat_id' => $chat_id, 
        // 'protect_content' => true, 
        'text' => $text,
        'disable_web_page_preview' => false
    );
    if ( $parse_mode!=''){ $data['parse_mode'] = $parse_mode; }
    if ( $inline_keyboard ){ $data['reply_markup'] = json_encode( array( "inline_keyboard" => $inline_keyboard ) ); }
    if ( $keyboard ){ $data['reply_markup'] = json_encode( array( "keyboard" => $keyboard ) );}
    $fields_string = http_build_query($data);

    $ch = curl_init();
    curl_setopt($ch,CURLOPT_URL, $url);
    curl_setopt($ch,CURLOPT_POST, true);
    curl_setopt($ch,CURLOPT_POSTFIELDS, $fields_string);
    curl_setopt($ch,CURLOPT_RETURNTRANSFER, true); 

    $result = curl_exec($ch);
    return $result;
}

function amplitudeSendEvent ($form_id, $event_name){
    /* example
    curl --data '{"api_key": "6ed48d4675bcade329dc6504c353597e", "events": [{"user_id": "john_doe@gmail.com", "event_type": "watch_tutorial",
    "user_properties": {"Cohort": "Test A"}, "country": "United States", "ip": "127.0.0.1"}]}' https://api.amplitude.com/2/httpapi
    */

    $event_properties['project'] = AMPLITUDE_PROJECT;
    $event_properties['event_name'] = $event_name;
   

    $event = Array (
        "user_id" => $form_id,
        "event_type" => $event_name,
        "time" => time(),
        "user_properties" => [],
        "event_properties" => $event_properties,
        'platform' => 'App'
    );
    $url = "https://api.amplitude.com/2/httpapi";
    $data = array(
        'api_key' => AMPLITUDE_KEY, 
        'events' => Array($event)
    );

    $options = array(
        'http' => array(
            'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
            'method'  => 'POST',
            'content' => json_encode($data)
        )
    );
    $context  = stream_context_create($options);
    $result = file_get_contents($url, false, $context);
    if ($result === FALSE) { 
        debuglog ("amplitude_send_event", 'request error');
     }
    
    return $result;
}

?>