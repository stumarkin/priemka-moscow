<?
/**
 * @author Sergey Tumarkin https://tumarkin.me
 */

require_once( dirname(__DIR__)."/config.php" );
require_once( dirname(__DIR__)."/shared.functions.php" );

$formType = Array(
    'room' => Array(
        'id' => '',
        'type' => 'room',
        'comment' => '',
        'nested' => Array(),
        'defaultNested' => Array()
    ),
    'section' => Array(
        'id' => '',
        'type' => 'section',
        'nested' => Array()
    ),
    'check' => Array(
        'id' => '',
        'type' => 'check',
        'value' => true,
        'parent' => '',
    ),
);

function getSourceContent( $vesion = ''){   // returns [ "content", "vesion" ]
    // get file path for latest active content form DB
  
    $select_result = sqlQuery("SELECT file_path, id FROM form_templates WHERE ".($vesion ? "id = '".$vesion."' AND " : "" )."is_active = '1' ORDER BY id DESC LIMIT 1");
    if ($select_result->num_rows > 0) { 
        $select_result_row = $select_result->fetch_assoc();
        if ($select_result_row["file_path"]){
            // and get the content itself
            $sourceContentData = file_get_contents( $select_result_row["file_path"] );
            $sourceContentRows = explode("\n", $sourceContentData);
            $sourceContent = Array();
            foreach($sourceContentRows as $sourceContentRow) {
                $row = str_getcsv($sourceContentRow);
                if ($row[0]=='Code') continue;
                $sourceContent[$row[0]] = Array(
                    'Code' => $row[0],
                    'ParentCode' => $row[1],
                    'Type' => $row[2],
                    'Name' => $row[3],
                    'Report' => $row[4],
                    'Clause' => $row[5],
                    'DefaultSectionsCodes0' => $row[6],
                    'DefaultSectionsCodes1' => $row[7],
                    'DefaultSectionsCodes2' => $row[8],
                );
            };
            return [ "content" => $sourceContent, "version" => $select_result_row["id"] ];
        };
    };
    return false;
}

function getCurrentTemplateVersion( $authtoken ){   // returns vesion : integer
    $select_result = sqlQuery(
        "SELECT ft.id
        FROM form_templates ft
        JOIN users u ON ft.accountid = u.accountid
        JOIN auth a ON u.id = a.userid
        WHERE (a.token = '".$authtoken."' OR ft.id = '1') AND ft.is_active = '1' 
        ORDER BY ft.date_insert DESC
        LIMIT 1"
    );
    if ($select_result->num_rows > 0) { 
        $select_result_row = $select_result->fetch_assoc();
        return $select_result_row["id"];
    } else {
        return false;
    }
}

function getDictionary( $sourceContent ){
    $dictionary = Array();
    foreach ($sourceContent as $sourceContentRow){
        $dictionary[ $sourceContentRow['Code'] ] = Array(
            'name' => $sourceContentRow['Name'], 
            'report' => $sourceContentRow['Report'], 
            'clause' => $sourceContentRow['Clause']
        );
    }
    return $dictionary;
}


function makeQuestion ( $parent,
                        $id,
                        $type,
                        $defaultNested0 = '', 
                        $defaultNested1 = '', 
                        $defaultNested2 = ''
                    ) {
    global $formType;
    $question = $formType[$type];
    $question['parent'] = $parent;
    $question['id'] = $id;
    if ($defaultNested0 != ''){ $question['defaultNested0'] = preg_split("/[\s,]+/", trim($defaultNested0)); }
    if ($defaultNested1 != ''){ $question['defaultNested1'] = preg_split("/[\s,]+/", trim($defaultNested1)); }
    if ($defaultNested2 != ''){ $question['defaultNested2'] = preg_split("/[\s,]+/", trim($defaultNested2)); }
    return $question;
}

function makeTokenWithKey( $str ) {
    return md5( TOKEN_KEY.$str );
}


function logIn( $username, $password, $deviceid=' ', $device=' ') {
    $select_result = sqlQuery(
        "SELECT id 
        FROM users 
        WHERE username = '".$username."' AND password_hash = '".$password."'
        LIMIT 1"
    );
    if ($select_result->num_rows > 0) { 
        $row = $select_result->fetch_assoc();
        $userid = $row["id"];
        $token = md5(time());
        if (sqlQuery(
            "INSERT 
            INTO auth (userid, token, date_insert, valid_till, deviceid, device, app) 
            VALUES ('{$userid}', '{$token}', '".getDateTimeNow()."', '".getDateTimeAfterDays(AUTH_DAYS)."', '{$deviceid}', '{$device}', 'app')"
            )
        ){
            return $token;
        }
    }
    return false;
}

function auth( $authtoken ) {
    $select_result = sqlQuery(
        "SELECT id
        FROM auth
        WHERE token='{$authtoken}' AND valid_till > NOW()
        LIMIT 1
    ");
    if ($select_result->num_rows > 0) { 
        $row = $select_result->fetch_assoc();
        sqlQuery(
            "UPDATE auth 
            SET last_login = '".getDateTimeNow()."'
            WHERE token='{$authtoken}' AND id = '{$row['id']}' 
        ");
        return true;
    }
    return false;
}


function getForms( $authtoken ) {
    $forms = [];
    $result = sqlQuery(
        "SELECT f.id, f.address, f.failChecksCountTotal, f.date_update, f.apartment_num, f.customer 
        FROM forms f
        JOIN auth a ON f.userid = a.userid
        WHERE a.token = '".$authtoken."' AND f.is_active=1
        ORDER BY f.date_insert DESC"
    );
    if ($result->num_rows > 0) { 
        while($row = $result->fetch_assoc()) {
            $forms[] = [
                'id' =>  $row["id"],
                'address' =>  $row["address"],
                'failChecksCountTotal' =>  $row["failChecksCountTotal"],
                'timestamp' =>  $row["date_update"],
                'apartmentNum' =>  $row["apartment_num"],
                'customer' =>  $row["customer"],
            ];
        };
    };
    return $forms;
}

function getForm( $id, $authtoken) {
    if (!$id) return false;
    $result = sqlQuery(
        "SELECT f.* 
        FROM forms f
        JOIN auth a ON f.userid = a.userid
        WHERE a.token = '".$authtoken."'  AND f.id='".$id."'
        ORDER BY f.date_insert DESC
        LIMIT 1"
    );
    if ($result->num_rows > 0) { 
        $row = $result->fetch_assoc();
        return $row["form"];
    } else {
        return false;
    }
}

function deleteForm( $id, $authtoken) {
    if (!$id) return false;
    return sqlQuery(
        "UPDATE forms f
        JOIN auth a ON f.userid = a.userid
        SET f.is_active = 0,
            f.date_update = '".getDateTimeNow()."'
        WHERE a.token = '{$authtoken}'  AND f.id = '{$id}' 
    ");
}

function checkFormIdExists( $id ){
    $result = sqlQuery("SELECT id FROM forms WHERE id = '".$id."' LIMIT 1");
    return $result->num_rows > 0;
}

function createForm( $authtoken ){ // returns {id, token)
    $flagIdExists = true;
    do {
        $id = substr(md5(time()), 0, 5);
        $token = makeTokenWithKey( $id );
        $flagIdExists = checkFormIdExists($id);
    } while ($flagIdExists);
    
    // $result = sqlQuery("INSERT INTO forms (id, date_insert, userid) VALUES ('".$id."', '".getDateTimeNow()."', '".$_POST['userid']."')");
    $result = sqlQuery(
        "INSERT INTO forms (id, date_insert, userid)
        SELECT '".$id."', '".getDateTimeNow()."', a.userid
        FROM auth a
        WHERE a.token = '".$authtoken."'"
    );
    return $result ? [ 'id' => $id, 'token' => $token ] : false;
}


function getTemplateForm( $sourceContent ) {
    $form = Array(
        "id" => "",
        "token" => "",
        "authtoken" => "",
        "address" => "", 
        "formTemplateVersion" => $sourceContent["version"],
        "apartment" => Array(),
        "nested_templates" => Array() 
    );
    
    // важна последовательность добавления в массив - она равна последовательности в анкете
    foreach( $sourceContent["content"] as $row ){
        $form['nested_templates'][] = makeQuestion( 
                                            $row["ParentCode"], 
                                            $row["Code"], 
                                            $row["Type"], 
                                            $row["DefaultSectionsCodes0"], 
                                            $row["DefaultSectionsCodes1"], 
                                            $row["DefaultSectionsCodes2"], 
                                        );
    }

    return $form;
}


function updateForm($id, $form_json, $summary_json) {
    $userid = $_POST['userid'];
    $form = json_decode($form_json);
    $summary = json_decode($summary_json);
    return sqlQuery("UPDATE forms 
                        SET form = '".$form_json."',
                            authtoken = '".$form->authtoken."',
                            address = '".$summary->address."',
                            apartment_num = '".$summary->apartmentNum."',
                            customer = '".$summary->customer."',
                            checksCountTotal = '".$summary->checksCountTotal."',
                            failChecksCountTotal = '".$summary->failChecksCountTotal."',
                            imagesCountTotal = '".$summary->imagesCountTotal."',
                            date_update = '".getDateTimeNow()."'
                        WHERE id = '".$id."' 
                        LIMIT 1;");
}


function getPlans() {
    $plans = [];
    $result = sqlQuery(
        "SELECT * 
        FROM plans 
        WHERE is_public = 1 
        LIMIT 10"
    );
    if ($result->num_rows > 0) { 
        while($row = $result->fetch_assoc()) {
            $plans[] = $row;
        }
        return $plans;
    } else {
        return false;
    }
}


function CreateAccount($name, $username, $app='web', $deviceid='', $device='') {
    $demo_account_id = '1';
    // $demo_form_templates_id = '1';
    $demo_form_id = 'demo_source';
    $plan_name = 'Про';
    $planid = '1711116163';
    $count_demo_days = 5;


    $result_ac = sqlQuery( 
        "SELECT id
        FROM accounts
        WHERE name = '{$name}' 
        LIMIT 1"
    );

    if ($result_ac->num_rows > 0 ) return ['error'=>"Компания c наименованием {$name} уже зарегистрирована. Пожалуйста укажите другое."];

    $result_us = sqlQuery( 
        "SELECT id
        FROM users
        WHERE username = '{$username}'"
    );

    if ($result_us->num_rows > 0 ) return ['error'=>"Пользователь {$username} уже зарегистрироваy. Пожалуйста укажите другой e-mail для регистрации новой компании"];

    $account_id = sqlQuery(
        "INSERT 
        INTO accounts (
            planid,	
            name,	
            logo,	
            requisites,	
            location,	
            stamp,	
            facsimile,	
            attachmentfiles,	
            googlesheets_csv,	
            googlesheets_edit,	
            date_insert
        ) 
        SELECT 
            planid,	
            '{$name}',	
            logo,	
            requisites,	
            location,	
            stamp,	
            facsimile,	
            attachmentfiles,	
            googlesheets_csv,	
            '',	
            '".getDateTimeNow()."'
        FROM accounts 
        WHERE id='{$demo_account_id}'
        LIMIT 1"
    );
    if(!is_numeric($account_id)){
        return ['error'=>"Ошибка добавления аккаунта: {$account_id}"];
    }

    // $form_templates_id = sqlQuery(
    //     "INSERT 
    //     INTO form_templates (
    //         accountid,
    //         is_active,	
    //         file_path,	
    //         date_insert
    //     ) 
    //     SELECT 
    //         '{$account_id}',	
    //         '1',	
    //         file_path,		
    //         '".getDateTimeNow()."'
    //     FROM form_templates 
    //     WHERE id='{$demo_form_templates_id}'
    //     LIMIT 1"
    // );
    // if(!is_numeric($account_id)){
    //     return ['error'=>"Ошибка добавления шаблона: {$form_templates_id}"];
    // }
    
    $password = substr(md5(time()), 0, 6);
    $password_hash = md5($password);
    $user_id = sqlQuery(
        "INSERT 
        INTO users (username, password_hash, accountid, is_active, is_admin, date_insert) 
        VALUES ('{$username}', '{$password_hash}', '{$account_id}', '1', '1', '".getDateTimeNow()."')"
    );
    if(!is_numeric($user_id)){
        return ['error'=>"Ошибка добавления пользователя: {$user_id}"];
    }

    $now = substr(getDateTimeNow(), 0, 19);
    $date_end = substr(getDateTimeAfterDays( $count_demo_days ), 0, 19);
    $description = 'Пробный бесплатный доступ к системе Приёмка Про по тарифу "'.$plan_name.'" для аккаунта #'.$account_id.' на период с '.date('d.m.y', strtotime($now)).' по '.date('d.m.y', strtotime($date_end));
    $billing_id = sqlQuery( 
        "INSERT 
        INTO billing (accountid, useremail, planid, sum, date_insert, date_plan_start, date_plan_end, payment_provider, status, paid, invoice_subject)
        VALUES ('{$account_id}', '{$username}', '{$planid}', '0', '{$now}', '{$now}', '{$date_end}', 'demo', 'success', 1, '{$description}' )"
    );

    $authtoken = 'onSignUp_'.substr(md5(time()), 0, 23);
    $auth_id = sqlQuery(
        "INSERT 
        INTO auth (userid, token, date_insert, valid_till, deviceid, device, app) 
        VALUES ('{$user_id}', '{$authtoken}', '".getDateTimeNow()."', '".getDateTimeAfterDays(1)."', '{$deviceid}', '{$device}', '{$app}')"
    );
   
    $form_id = sqlQuery(
        "INSERT
        INTO forms (id,	userid, address, apartment_num, customer, checksCountTotal, failChecksCountTotal, date_insert, date_update, form)
        SELECT 'demo{$user_id}', '{$user_id}', address, apartment_num, customer, checksCountTotal, failChecksCountTotal, '".getDateTimeNow()."', '".getDateTimeNow()."', form  
        FROM forms 
        WHERE id='{$demo_form_id}'
        LIMIT 1");

    if (is_numeric($account_id) && is_numeric($user_id)){
        $content = file_get_contents('./mail_template_welcome.html');
        $content = str_replace("%password%", $password, $content );
        $content = str_replace("%username%", $username, $content );
        $content = str_replace("%name%", $name, $content );
        send_email($username,'Успешная регистрация', $content);
        return ['authtoken'=>$authtoken];
    } else {
        return false;
    }
}


function getPlan( $authtoken ) {
    $result = sqlQuery(
        "SELECT p.*, ac.name as accountname, b.date_plan_end, DATEDIFF(b.date_plan_end, NOW()) as days_left
        FROM billing b
        JOIN plans p ON b.planid = p.id
        JOIN accounts ac ON b.accountid = ac.id
        JOIN users u1 ON u1.accountid = ac.id
        JOIN auth au ON au.userid = u1.id
        WHERE au.token = '{$authtoken}' AND paid=1
        ORDER BY date_plan_end DESC
        LIMIT 1"
    );
    if ($result->num_rows > 0) { 
        return $result->fetch_assoc();
    } else {
        return false;
    }
}


function getAccountIdByAuthtoken( $authtoken ) {
    $result = sqlQuery(
        "SELECT u.accountid
        FROM users u
        JOIN auth ON u.id = auth.userid
        WHERE auth.token = '{$authtoken}'
        LIMIT 1"
    );
    if ($result->num_rows > 0) { 
        $user = $result->fetch_assoc();
        return $user["accountid"];
    } else {
        return false;
    }
}

function saveUploadedFormFile( $authtoken, $file, $formid ) {
    $accountid = getAccountIdByAuthtoken($authtoken);
    $root = $_SERVER['DOCUMENT_ROOT'];
    $account_dir = TARGET_ACCOUNTFILE_DIR.$accountid;
    $account_forms_dir = $account_dir.'/forms';
    $target_dir = $account_forms_dir.'/'.$formid;
    $filename = '/'.$file['name'];
    
    if(empty($file['name'])){
      $status = "File not found";
    } else if (file_exists( $root.$target_dir.$filename )) {
      $status = "File already exists";
    } else if ( $file["size"] > 5000000 ) {
      $status = "File is too large";
    } else if ( !(is_dir($root.$account_dir) || mkdir($root.$account_dir))){
        $status = "Error mkdir {$root}{$account_dir}";
    } else if ( !(is_dir($root.$account_forms_dir) || mkdir($root.$account_forms_dir))){
        $status = "Error mkdir {$root}{$account_forms_dir}";
    } else if ( !(is_dir($root.$target_dir) || mkdir($root.$target_dir))){
        $status = "Error mkdir {$root}{$target_dir}";
    } else if ( !move_uploaded_file( $file["tmp_name"], $root.$target_dir.$filename ) ){
        $status = "Error move_uploaded_file {$root}{$target_dir}{$filename}";
    } else {
        return $target_dir.$filename;
    } 
    
    return false;
    // TBD Log error somehow

 }


// API ------------------------------------------------------------------------------------------------------------------
header('Access-Control-Allow-Origin: *'); // Замените на ваш домен
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
// header('Access-Control-Allow-Headers: Content-Type, Authorization');
// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: GET, POST');
header("Access-Control-Allow-Headers: X-Requested-With");

if (isset($_GET['method'])) {
    $authtoken = $_GET['authtoken'];
    switch ($_GET['method']) {
        case "ping":
            echo json_encode( ["result"=> 'pong']);
            break;

        case "getplans":
            $plans = getPlans();
            echo json_encode( ["result"=>$plans!==false, 'plans'=>$plans]);
            break;

        case "login":
            $token = logIn($_POST['username'], $_POST['password'], $_POST['deviceid'], $_POST['device']);
            echo json_encode( ["result"=>$token!==false, "authtoken" => $token] );
            break;
        
        case "auth":
            // http_response_code(404);
            $result = auth( $_GET['authtoken'] );
            echo json_encode( ["result" => $result, '_GET'=>$_GET] );
            break;

        case "gettemplate":
            if ( isset($_GET['localversion']) && isset($authtoken) ){
                $currentTemplateVersion = getCurrentTemplateVersion( $authtoken );
                if ($currentTemplateVersion != $_GET['localversion']){
                    $sourceContent = getSourceContent( $currentTemplateVersion );
                    $template = [ "version" => $currentTemplateVersion, "dictionary" => getDictionary( $sourceContent["content"] ), "form" => getTemplateForm( $sourceContent ) ];
                }
                echo json_encode( ["result" => $currentTemplateVersion!=false, "needtoupdate" => $currentTemplateVersion != $_GET['localversion'], "template" => $template ] );
            } else {
                echo json_encode( ["result" => false ] );
            }
            break;

        case "getform":
            $form = getForm( $_GET['id'], $authtoken);
            echo json_encode( ['result'=> $form!==false, 'form' => $form ] );
            break;

        case "getbanners":
            $banners = file_get_contents( '../source/banners.json' );
            echo json_encode( [ 'result' => true, 'banners' => json_decode($banners) ] );
            break;

        case "getforms":
            $forms = getForms( $authtoken );
            echo json_encode( ['result'=> count($forms)>0, 'forms' => $forms ] );
            break;

        case "createform":
            $newForm = createForm( $authtoken );
            echo json_encode( ['result'=> $newForm!==false, 'id' => $newForm['id'], 'token' => $newForm['token'] ] );
            break;

        case "updateform":
            $result = updateForm($_POST['id'], $_POST['form'], $_POST['summary']);
            echo json_encode( ['result'=> $result!==false, 'id' => $_POST['id']] );
            break;
        
        case "deleteform":
            $result = deleteForm( $_GET['id'], $authtoken);
            echo json_encode( ['result' => $result] ); 
            break;

        case "getconfig":
            $designtypes = [
                'С чистовой отделкой',
                'White-box',
                'Без отделки'
            ];
            $appupdateurl = false;
            echo json_encode([ 
                'result' => true, 
                "designtypes" => $designtypes, 
                "appupdateurl" => $appupdateurl, 
                "featuretoggles" => $featuretoggles, 
                "get" => $_GET 
            ]); 
            break;
        
        
        case "uploadformfile":
            $uri = saveUploadedFormFile( $_GET['authtoken'], $_FILES['file'], $_POST['formid']);
            echo json_encode( Array("result" => $uri!==false , "uri" => $uri) );
            break;
  
        case "createaccount":
            $result = CreateAccount( $_POST['name'], $_POST['username'], $_POST["app"], $_POST["deviceid"], $_POST["device"] );
            if (is_array($result)){
                if (isset($result['error'])) echo json_encode( ['result' => false , 'error' => $result['error']] );
                if (isset($result['authtoken'])) echo json_encode( ['result' => true , 'authtoken' => $result['authtoken']] );
            } else {
                echo json_encode( ['result' => false , '_POST' => $_POST] );
            }
            break;

        case "getaccountplan":
            $plan = getPlan( $_GET['authtoken'] );
            echo json_encode( ["result"=>$plans!==false, 'plan'=>$plan, '_GET'=>$_GET]); 
            break;
        
        default:
            echo json_encode( Array('result' => false, "error" => "Unknown method" ) ); 
            break;
    }
}

//------------------------------------------------------------------------------------------------------------------------

?>