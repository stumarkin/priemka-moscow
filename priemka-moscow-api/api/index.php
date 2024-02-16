<?

CONST FORM_VERSION = 2;

const DB_SERVERNAME = "localhost";
const DB_USERNAME = "stumarkin_an";
const DB_PASSWORD = "yFw5FSXe";
const DB_DBNAME = "stumarkin_an";

const DOMAIN= "https://priemka-pro.ru/";

const TOKEN_KEY = 'ncsaodj2';

const BOT_TOKEN = "5840260388:AAH8AsZPEeWRnXVh89GehfeWUn4MHsG0oJ4";
const LOG_CHANNEL = "-100";

const SOURCE_CONTENT_CSV = "https://priemka-pro.ru/api/source/sourceContent.csv";
const SOURCE_ALLOWED_TELEGRAM_ACCOUTS_CSV = "https://priemka-pro.ru/api/source/allowedTelegramAccounts.csv";

$formType = Array(
    'boolean' => Array(
        'id' => '',
        'type' => 'boolean',
        'value' => true,
        'checked' => false,
        'parent' => '',
    ),
    'string' => Array(
        'id' => '',
        'type' => 'string',
        'value' => '',
        'checked' => false,
        'parent' => '',
    ),
    'readonly' => Array(
        'id' => '',
        'type' => 'readonly',
        'value' => 0,
        'checked' => false,
        'parent' => '',
        'nested' => Array()
    ),
    'enum' => Array(
        'id' => '',
        'type' => 'enum',
        'delay' => false,
        'value' => 0,
        'checked' => false,
        'parent' => '',
        'enum' => Array(
            0 => Array('name'=>'Один', 'value' => '1' )
        ),
        'nested' => Array(),
    ),
);

$plans = Array (
    'pers1d10r-text' => Array(
        'name' => 'Персональный на 1 месяц за 990 ₽',
        'price' => 10,
        'days' => 22
    ),
    'pers1m990r' => Array(
        'name' => 'Персональный на 1 месяц за 990 ₽',
        'price' => 990,
        'days' => 30
    ),
    'pers6m4990r' => Array(
        'name' => 'Персональный на 6 месяцев за 4990 ₽',
        'price' => 4990,
        'days' => 183
    ),
);


$sourceContentData = file_get_contents( SOURCE_CONTENT_CSV );
$sourceContentRows = explode("\n", $sourceContentData);
$sourceContent = Array();
foreach($sourceContentRows as $sourceContentRow) {
    $row = str_getcsv($sourceContentRow);
    if ($row[0]=='Code') continue;
    $sourceContent[$row[0]] = Array(
        'Code' => $row[0],
        'ParentCode' => $row[1],
        'isCollection' => $row[2],
        'Type' => $row[3],
        'ShortName' => $row[4],
        'Name' => $row[5],
        'Tint' => $row[6],
        'ReportName' => $row[7],
    );
}

$allowedTelegramAccountsData = file_get_contents( SOURCE_ALLOWED_TELEGRAM_ACCOUTS_CSV );
$allowedTelegramAccountsRows = explode("\n", $allowedTelegramAccountsData);
$allowedTelegramAccounts = Array();
foreach($allowedTelegramAccountsRows as $allowedTelegramAccountsRow) {
    $row = str_getcsv($allowedTelegramAccountsRow);
    $allowedTelegramAccounts[] = $row[0];
}


$dictionary = Array();
foreach ($sourceContent as $sourceContentRow){
    $dictionary[ $sourceContentRow['Code'] ] = Array(
        'name' => $sourceContentRow['ShortName'], 
        'shortname' => $sourceContentRow['ShortName'], 
        'tint' => $sourceContentRow['Tint'], 
        'reportname' => $sourceContentRow['ReportName']
    );
}




function makeQuestion ( $parent,
                        $id,
                        $type,
                        $value = '', 
                        $enum = ''
                    ) {
    global $formType;
    $question = $formType[$type];
    $question['parent'] = $parent;
    $question['id'] = $id;
    if ($value != ''){ $question['value'] = $value; }
    if ($enum != ''){ $question['enum'] = $enum; }
    return $question;
}

function makeTokenWithKey( $str ) {
    return md5( TOKEN_KEY.$str );
}

function createInvoice( $user_id, $plan_id ) {
    global $plans;
    // TODO params validation
    return sqlQuery("INSERT 
                    INTO billing (
                            plan_id, 
                            tg_user_id, 
                            date_insert, 
                            date_plan_start, 
                            date_plan_end, 
                            invoice_subject, 
                            payment_provider
                        ) 
                    VALUES (
                            '".$plan_id."', 
                            '".$user_id."', 
                            '".getDateTimeNow()."', 
                            '".getDateTimeNow()."', 
                            '".getDateTimeAfterDays( $plans[$plan_id]['days'])."',
                            '".$plans[$plan_id]['name']."', 
                            'yookassa'
                        )"
                    );
}

function makeForm() {
    if (isset($_GET['id'])){
        $result = sqlQuery("SELECT form FROM forms WHERE id = '".$_GET['id']."'");
        if ($result->num_rows > 0) { 
            while($row = $result->fetch_assoc()) {
                $form = $row["form"];
            }
        } 
        return $form;
    } else {
        $id = md5( time() );
        $token = makeTokenWithKey( $id );
        $form = Array(
            "id" => $id,
            "token" => $token,
            // "status" => 0,
            "type" => "", // offline | online
            "address" => "", 
            "formTemplateVersion" => FORM_VERSION,
            // "apartment0" => makeFormApartment(),
            "apartment" => Array(makeQuestion('', 'apartment', 'enum', '', Array( Array('name'=>'Погнали!', 'value' => '1')) )),
            // "templates" => Array("room" => makeFormRoom(), "window" => makeFormWindow() ),
            "nested_templates" => Array() 
        );
        
        // важна последовательность добавления в массив - она равна последовательности в анкете

    
        global $sourceContent;
        foreach($sourceContent as $row){
          $form['nested_templates'][] = makeQuestion( 
            $row["ParentCode"], 
            $row["Code"], 
            $row["Type"], 
            '', 
            ($row["Type"] == 'enum' ? Array(1 => Array('name'=>'1', 'value' => '1'), 2 => Array('name'=>'2', 'value' => '2'), 3 => Array('name'=>'3', 'value' => '3'), 4 => Array('name'=>'4', 'value' => '4') ) : '')
          );
        }

        // sqlQuery("INSERT INTO forms (id, form) VALUES ('".$id."', '".json_encode($form)."')");
        // sqlQuery("INSERT INTO user2form (form_id) VALUES ('".$id."')");
        return json_encode($form);
    }
    
}


function sqlQuery($sql) {
    $conn = new mysqli(DB_SERVERNAME, DB_USERNAME, DB_PASSWORD, DB_DBNAME);
    if ($conn->connect_error) {
        die("Connection failed: " . $conn->connect_error);
    }
    $result = $conn->query($sql);
    if ($result===TRUE) {
        $result = $conn->insert_id;
    } 
    $conn->close();
    return $result;
}

function getDateTimeNow ($format = 'Y-m-d\TH:i:s.u'){
    $d = new DateTime('NOW');
    return $d->format($format);
}

function getDateTimeAfterDays ($days, $format = 'Y-m-d\TH:i:s.u'){
    $d = new DateTime('+'.$days.' days');
    return $d->format($format);
}

function updateForm() {
    $form = json_decode($_POST['form']);
    $progress = json_decode($_POST['progress']);
    $user = json_decode($_POST['user']);

    $result = sqlQuery("SELECT id FROM forms WHERE id='".$form->id."';");
    if ($result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            return sqlQuery("UPDATE forms 
                             SET form = '".$_POST['form']."',
                                progress_total = '".$progress->total."',
                                progress_success = '".$progress->success."',
                                progress_fail = '".$progress->fail."',
                                progress_checked = '".$progress->checked."',
                                progress_unchecked = '".$progress->unchecked."',
                                date_update = '".getDateTimeNow()."'
                             WHERE id = '".$form->id."';");
        }
    } else {
        sqlQuery("INSERT INTO forms (id, form, date_insert) VALUES ('".$form->id."', '".$_POST['form']."', '".getDateTimeNow()."')");
        sqlQuery("INSERT INTO user2form (form_id, tg_user_id, tg_user_username) VALUES ('".$form->id."', '".$user->id."', '".$user->username."')");
        return true;
    }
}

function getUserByFormId( $form_id ) {
    if ( isset($form_id) ){
        $result = sqlQuery("SELECT tg_user_id FROM user2form WHERE form_id = '".$form_id."'");
        if ($result->num_rows > 0) { 
            while($row = $result->fetch_assoc()) {
                $user = Array( "id" => intval($row["tg_user_id"]), "username" => $row["tg_user_username"] );
            }
        } 
        return $user;
    } 
    return false;
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
    // debuglog ("tg_send_message_query", http_build_query($data));
    $fields_string = http_build_query($data);

    $ch = curl_init(); //open connection
    curl_setopt($ch,CURLOPT_URL, $url);
    curl_setopt($ch,CURLOPT_POST, true);
    curl_setopt($ch,CURLOPT_POSTFIELDS, $fields_string);
    curl_setopt($ch,CURLOPT_RETURNTRANSFER, true); //So that curl_exec returns the contents of the cURL; rather than echoing it

    $result = curl_exec($ch);
    return $result;
}

function getFormsCountForUser ( $tg_user_id ){
    $result = sqlQuery("SELECT count(form_id) as count FROM user2form WHERE tg_user_id = '".$tg_user_id."'");
    if ($result->num_rows > 0) { 
        while($row = $result->fetch_assoc()) {
            return $row["count"];
        }
    }
    return 0;
}

function amplitudeSendEvent ($form_id, $event_name){
    /* example
    curl --data '{"api_key": "6ed48d4675bcade329dc6504c353597e", "events": [{"user_id": "john_doe@gmail.com", "event_type": "watch_tutorial",
    "user_properties": {"Cohort": "Test A"}, "country": "United States", "ip": "127.0.0.1"}]}' https://api.amplitude.com/2/httpapi
    */

    $event_properties['project'] = 'auditnovostroy';
    $event_properties['event_name'] = $event_name;
   

    $event = Array (
        "user_id" => $form_id,
        "event_type" => $event_name,
        "time" => time(),
        "user_properties" => [],
        "event_properties" => $event_properties,
        'platform' => 'Telegram'
    );
    $url = "https://api.amplitude.com/2/httpapi";
    $data = array(
        'api_key' => "b5c962fc8eead3126ff097033f5dfb24", 
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

// API ------------------------------------------------------------------------------------------------------------------



if (isset($_GET['method'])) {
    switch ($_GET['method']) {
        case "gettgaccounts":
            echo json_encode( $allowedTelegramAccounts );
            break;
        case "getdictionary":
            echo json_encode( $dictionary );
            break;
        case "getformscount":
            echo getFormsCountForUser($_GET['user_id']);
            break;
        case "getform":
            echo makeForm(); 
            break;
        case "updatesource":
            $url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTK4DbDdT1u7oJqY2HUWcxU0jMpvtDZw8ORgyRH9R1juJjkmItBGq8BoHHKunuLk_Yaru0PsEaAJkZv/pub?gid=1638094264&single=true&output=csv';
            $sourceAllowedTelegramAccounts = file_get_contents($url);
            if (file_put_contents('source/allowedTelegramAccounts.csv', $sourceAllowedTelegramAccounts)){
                echo "<h3 style='color:green'>Обновлено в allowedTelegramAccounts.csv:</h3 style='color:green'><pre>".$sourceAllowedTelegramAccounts."</pre>";
            } else {
                echo "<h3 style='color:green' style='color:red'>Не удалось обновить allowedTelegramAccounts.csv:</h3 style='color:green'>";
            }
            
            $url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTK4DbDdT1u7oJqY2HUWcxU0jMpvtDZw8ORgyRH9R1juJjkmItBGq8BoHHKunuLk_Yaru0PsEaAJkZv/pub?gid=0&single=true&output=csv';
            $sourceSourceContent = file_get_contents($url);
            file_put_contents('source/sourceContent.csv', $sourceSourceContent);
            if (file_put_contents('source/allowedTelegramAccounts.csv', $sourceAllowedTelegramAccounts)){
                echo "<h3 style='color:green'>Обновлено в sourceContent.csv:</h3 style='color:green'><pre>".$sourceSourceContent."</pre>";
            } else {
                echo "<h3 style='color:green' style='color:red'>Не удалось обновить sourceContent.csv:</h3 style='color:green'>";
            }
            
            break;
        case "createinvoice":
            echo json_encode( createInvoice($_GET['user_id'], $_GET['plan_id']));
            break;
        case "getuser":
            // /api/?method=getuser&form_id=5ee27c58be6d99b27ad7f4d4ec5c9412
            if ( $user = getUserByFormId( $_GET['form_id'] ) ){
                echo json_encode( $user );
            }
            break;
        case "setform":
            $form = json_decode($_POST['form']);
            if (makeTokenWithKey($form->id) == $form->token){
                echo json_encode( updateForm() ? Array("result" => true) : Array("error" => "Failed to update form") ); 
            } else {
                echo json_encode( Array("error" => "Token validation fail") ); 
            }
            break;
        default:
            echo json_encode( Array("error" => "Unknown method") ); 
            break;
    }
}

//------------------------------------------------------------------------------------------------------------------------

?>