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

function signIn( $username, $password, $deviceid=' ') {
    $select_result = sqlQuery("SELECT id, is_admin FROM users WHERE username = '".$username."' AND password_hash = '".$password."' LIMIT 1");
    if ($select_result->num_rows > 0) { 
        $row = $select_result->fetch_assoc();
        if (sqlQuery("UPDATE users 
                    SET last_login = '".getDateTimeNow()."',
                    deviceid = '".$deviceid."'
                    WHERE id = '".$row["id"]."' LIMIT 1")){
                        return $row;
                    }
    
    };
    return false;
}

function isProDaysLeft( $deviceid) {
    $result = sqlQuery("SELECT id, date_plan_end FROM billing WHERE deviceid = '".$deviceid."' AND paid=1 AND date_plan_end > '".getDateTimeNow()."' ORDER BY date_plan_end DESC");
    if ($result->num_rows > 0) { 
        while($row = $result->fetch_assoc()) {
            $date1 = new DateTime("NOW");
            $date2 = new DateTime($row["date_plan_end"]);
            $interval = $date1->diff($date2);
            return  $interval->days;
        }
    } 
    return false;
}

function getForms( $userid ) {
    $forms = [];
    $result = sqlQuery("SELECT id, address, failChecksCountTotal, date_update, apartment_num, customer  FROM forms WHERE userid = '".$userid."' ORDER BY date_update DESC");
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

function getServicesWebviewContent( $id ) {
    $result = sqlQuery("SELECT * FROM banners WHERE screen = 'services' AND id = '".$id."'");
    if ($result->num_rows > 0) { 
        while($row = $result->fetch_assoc()) {
            return [
                'id' =>  $row["id"],
                'screen' =>  $row["screen"],
                'section' =>  $row["section"],
                'header' =>  $row["header"],
                'text' =>  $row["text"],
                'backgroundImage' =>  $row["background_image"],
                'backgroundColor' =>  $row["background_color"],
                'textColor' =>  $row["text_color"],
                'webviewContentHtml' =>  $row["webview_content_html"],
                'webviewCtaUrl' =>  $row["webview_cta_url"],
            ];
        };
    };
    return false;
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
        $sourceContent = getSourceContent();

        $id = substr(md5(time()), 0, 9);
        $token = makeTokenWithKey( $id );
        $form = Array(
            "id" => $id,
            "token" => $token,
            "deviceid" => "",
            "address" => "", 
            "formTemplateVersion" => $sourceContent["version"],
            "apartment" => Array(),
            "nested_templates" => Array() 
        );
        
        // важна последовательность добавления в массив - она равна последовательности в анкете
        foreach($sourceContent["content"] as $row){
          $form['nested_templates'][] = makeQuestion( 
            $row["ParentCode"], 
            $row["Code"], 
            $row["Type"], 
            $row["DefaultSectionsCodes0"], 
            $row["DefaultSectionsCodes1"], 
            $row["DefaultSectionsCodes2"], 
          );
        }

        return json_encode($form);
    }
    
}

function getDateTimeAfterDays ($days, $format = 'Y-m-d\TH:i:s.u'){
    $d = new DateTime('+'.$days.' days');
    return $d->format($format);
}

function updateForm() {
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
    switch ($_GET['method']) {
        case "ping":
            echo json_encode( ["result"=> 'pong']);
            break;

        case "signin":
            $user = signIn($_POST['username'], $_POST['password'], $_POST['deviceid'],);
            echo json_encode( $user ? ["result"=>true, "user" => $user, "signedintimeoutdays" => 1 ] : ["result"=>false] );
            break;

        case "getdictionary":
            $sourceContent = getSourceContent();
            echo json_encode( getDictionary( $sourceContent["content"] ) );
            break;

        case "getform":
            echo makeForm(); 
            break;

        case "getbanners":
            $banners = file_get_contents( '../source/banners.json' );
            echo json_encode( [ 'result' => true, 'banners' => json_decode($banners) ] );
            break;

        case "getforms":
            $forms = getForms($_GET['userid']);
            echo json_encode( ['result'=> count($forms)>0, 'forms' => $forms, 'GET' => $_GET ] );
            break;
        case "getserviceswebviewcontent":
            if (is_numeric($_GET['id'])){
                $banner_content = getServicesWebviewContent( intval($_GET['id']) );
                echo json_encode( ['result' => boolval($banner_content), 'content' => $banner_content ] );
            } else {
                echo json_encode( ['result' => false, 'error' => 'Unexpected id' ] );
            }
            break;
        // case "prodaysleft":
        //     $devicesIdToclearAsyncStorageForms = 'no';
        //     echo json_encode( [ 'result' =>  true, 'deviceid' => $_GET['deviceid'], 'ProDaysLeft' => isProDaysLeft($_GET['deviceid']), 'clearAsyncStorageForms' => ($devicesIdToclearAsyncStorageForms==$_GET['deviceid'] ? true : false)] );
        //     break;

        case "setform":
            $form = json_decode($_POST['form']);
            if (makeTokenWithKey($form->id) == $form->token){
                echo json_encode(  updateForm() ); 
            } else {
                echo json_encode( Array("error" => "Token validation fail") ); 
            }
            break;
        case "deleteform":
            if (makeTokenWithKey($_GET['id']) == $_GET['token']){
                echo json_encode( ['result' => sqlQuery('DELETE FROM forms WHERE id = "'.$_GET['id'].'" LIMIT 1;'), "request" => $_GET] ); 
            } else {
                echo json_encode( Array("error" => "Token validation fail") ); 
            }
            break;
        case "needupdate":
            $currentversion = [
                'android' => '1.0.1', 
                'ios' => '1.0.0'
            ];
            $appupdateurls = [
                'android' => 'https://apps.rustore.ru/app/com.stumarkin.priemkapro', 
                'ios' => ''
            ];
            if ($currentversion[$_GET['platform']] != $_GET['appversion']){
                $appupdateurl = $appupdateurls[$_GET['platform']];
            }
            echo json_encode( [ 'result' => false, "appupdateurl" => $appupdateurl ] ); 
            // echo json_encode( [ 'result' => ($appupdateurl!=''), "appupdateurl" => $appupdateurl ] ); 
            break;
        // case "getcurrentversion":
        //     echo json_encode( [ 'result' => true, "currentversion" => '1.0.1' ] ); 
        //     break;
        
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
            echo json_encode( Array("result" => true ) );
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