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
        WHERE a.token = '".$authtoken."' AND is_active = '1' 
        ORDER BY ft.date_insert DESC"
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

// deprecated
// function signIn( $username, $password, $deviceid=' ') {
//     $select_result = sqlQuery("SELECT id, is_admin FROM users WHERE username = '".$username."' AND password_hash = '".$password."' LIMIT 1");
//     if ($select_result->num_rows > 0) { 
//         $row = $select_result->fetch_assoc();
//         if (sqlQuery("UPDATE users 
//                     SET last_login = '".getDateTimeNow()."',
//                     deviceid = '".$deviceid."'
//                     WHERE id = '".$row["id"]."' LIMIT 1")){
//                         return $row;
//                     }
    
//     };
//     return false;
// }

function logIn( $username, $password, $deviceid=' ') {
    $select_result = sqlQuery("SELECT id FROM users WHERE username = '".$username."' AND password_hash = '".$password."' LIMIT 1");
    if ($select_result->num_rows > 0) { 
        $row = $select_result->fetch_assoc();
        $userid = $row["id"];
        $token = md5(time());
        if (sqlQuery("INSERT INTO auth (userid, token, date_insert, valid_till, deviceid) VALUES ('".$userid."', '".$token."', '".getDateTimeNow()."', '".getDateTimeAfterDays(AUTH_DAYS)."', '".$deviceid."')")){
            return $token;
        }
    }
    return false;
}

// deprecated
// function isProDaysLeft( $deviceid) {
//     $result = sqlQuery("SELECT id, date_plan_end FROM billing WHERE deviceid = '".$deviceid."' AND paid=1 AND date_plan_end > '".getDateTimeNow()."' ORDER BY date_plan_end DESC");
//     if ($result->num_rows > 0) { 
//         while($row = $result->fetch_assoc()) {
//             $date1 = new DateTime("NOW");
//             $date2 = new DateTime($row["date_plan_end"]);
//             $interval = $date1->diff($date2);
//             return  $interval->days;
//         }
//     } 
//     return false;
// }

function getForms( $authtoken ) {
    $forms = [];
    $result = sqlQuery(
        "SELECT f.id, f.address, f.failChecksCountTotal, f.date_update, f.apartment_num, f.customer 
        FROM forms f
        JOIN auth a ON f.userid = a.userid
        WHERE a.token = '".$authtoken."'
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
        "DELETE f
        FROM forms f
        JOIN auth a ON f.userid = a.userid
        WHERE a.token = '".$authtoken."'  AND f.id='".$id."'"
    );
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
        "deviceid" => "",
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

function getDateTimeAfterDays ($days, $format = 'Y-m-d\TH:i:s.u'){
    $d = new DateTime('+'.$days.' days');
    return $d->format($format);
}

function updateForm_deprecated() {
    $userid = $_POST['userid'];
    $form = json_decode($_POST['form']);
    $summary = json_decode($_POST['summary']);

    $formInDB = sqlQuery("SELECT id FROM forms WHERE id='".$form->id."';");
    if ($formInDB->num_rows > 0) {
            $result = sqlQuery("UPDATE forms 
                                SET form = '".$_POST['form']."',
                                    userid = '".$userid."',
                                    deviceid = '".$form->deviceid."',
                                    address = '".$summary->address."',
                                    apartment_num = '".$summary->apartmentNum."',
                                    customer = '".$summary->customer."',
                                    checksCountTotal = '".$summary->checksCountTotal."',
                                    failChecksCountTotal = '".$summary->failChecksCountTotal."',
                                    date_update = '".getDateTimeNow()."'
                                WHERE id = '".$form->id."' LIMIT 1;");
        return Array("method" => "update", "result" => $result);
    } else {
        $result = sqlQuery("INSERT INTO forms (id, form, date_insert) VALUES ('".$form->id."', '".$_POST['form']."', '".getDateTimeNow()."')");
        return Array("method" => "insert", "result" => $result);
    }
}

function updateForm($id, $form_json, $summary_json) {
    $userid = $_POST['userid'];
    $form = json_decode($form_json);
    $summary = json_decode($summary_json);
    return sqlQuery("UPDATE forms 
                        SET form = '".$form_json."',
                            deviceid = '".$form->deviceid."',
                            address = '".$summary->address."',
                            apartment_num = '".$summary->apartmentNum."',
                            customer = '".$summary->customer."',
                            checksCountTotal = '".$summary->checksCountTotal."',
                            failChecksCountTotal = '".$summary->failChecksCountTotal."',
                            date_update = '".getDateTimeNow()."'
                        WHERE id = '".$id."' 
                        LIMIT 1;");
}

function saveUploadedFile($uploadedFile, $targetFilePath){
    $saveFileStatus = "";
    if(empty($uploadedFile['name'])){
      $saveFileStatus = "File not found";
    } else if (file_exists($targetFilePath)) {
      $saveFileStatus = "File already exists";
    } else if ( $uploadedFile["size"] > 5000000 ) {
      $saveFileStatus = "File is too large";
    } else if ( ! move_uploaded_file( $uploadedFile["tmp_name"], $targetFilePath )) {
      $saveFileStatus = "Error saving file";
    } 
  
    return $saveFileStatus!="" ? $saveFileStatus : true;
  }

// API ------------------------------------------------------------------------------------------------------------------



if (isset($_GET['method'])) {
    $authtoken = $_GET['authtoken'];
    switch ($_GET['method']) {
        case "ping":
            echo json_encode( ["result"=> 'pong']);
            break;

        case "login":
            $token = logIn($_POST['username'], $_POST['password'], $_POST['deviceid'],);
            echo json_encode( ["result"=>$token!==false, "authtoken" => $token] );
            break;
        
        case "auth":
            echo json_encode( ["result" => true] );
            break;

        case "gettemplate":
            if ($_GET['localversion']){
                $localVersion = $_GET['localversion'];
                $currentTemplateVersion = getCurrentTemplateVersion( $authtoken );
                if ($currentTemplateVersion > $localVersion){
                    $sourceContent = getSourceContent( $currentTemplateVersion );
                    $template = [ "version" => $currentTemplateVersion, "dictionary" => getDictionary( $sourceContent["content"] ), "form" => getTemplateForm( $sourceContent ) ];
                }
                echo json_encode( ["result" => $currentTemplateVersion!=false, "needtoupdate" => $currentTemplateVersion > $localVersion, "template" => $template ] );
            } else {
                echo json_encode( ["result" => false , "error" => "What is local version?" ] );
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
            $featuretoggles = [
                'offlinemode' => false,
                'photo' => false,
            ];
            echo json_encode([ 
                'result' => true, 
                "designtypes" => $designtypes, 
                "appupdateurl" => $appupdateurl, 
                "featuretoggles" => $featuretoggles, 
                "get" => $_GET 
            ]); 
            // http_response_code(404);
            break;
        
        case "uploadfile":
            mkdir($_SERVER['DOCUMENT_ROOT'].TARGET_FILECV_DIR.$_POST['formid']);
            $targetFilePath = TARGET_FILECV_DIR.$_POST['formid'].'/'.basename( $_FILES['file']["name"]);
            $saveFileStatus = saveUploadedFile( $_FILES['file'], $_SERVER['DOCUMENT_ROOT'].$targetFilePath );
            if ( $saveFileStatus===true ){
              echo json_encode( Array("result" => true , "uri" => $targetFilePath) );
            } else {
              echo json_encode( Array("result" => false , "error" =>  $saveFileStatus, 'post'=>$_POST, 'files'=>$_FILES ) );
            }
            break;
  
        case "getcustomermodeon":
            echo json_encode( Array("result" => false ) );
            break;
  
        case "postapplication":
            echo json_encode( Array("result" => true, 'id' => substr(time(), -5), 'post' => $_POST ) ); 
            break;
  
        case "getapplication":
            echo json_encode( Array("result" => true, 'id' => $_GET['id'], 'status' => 'Принята. Ожидайте звонка менеджера', 'report' => 'ссылка будет доступна после проведения прёмки'  ) );
            break;
  
        default:
            echo json_encode( Array('result' => false, "error" => "Unknown method" ) ); 
            break;
    }
}

//------------------------------------------------------------------------------------------------------------------------

?>