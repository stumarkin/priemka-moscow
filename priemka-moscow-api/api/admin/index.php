<?
/**
 * @author Sergey Tumarkin https://tumarkin.me
 */

require_once( dirname(__DIR__)."/config.php" );
require_once( dirname(__DIR__)."/shared.functions.php" );
require_once( __DIR__."/admin-users.php" );
require_once( __DIR__."/admin-settings.php" );

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

function logIn( $username, $password, $deviceid=' ') {
    $select_result = sqlQuery("SELECT id FROM users WHERE username = '".$username."' AND password_hash = '".md5($password)."' AND is_admin=1 AND is_active=1 LIMIT 1");
    if ($select_result->num_rows > 0) { 
        $row = $select_result->fetch_assoc();
        $userid = $row["id"];
        $token = md5(time());
        if (sqlQuery(
            "INSERT 
            INTO auth (userid, token, date_insert, valid_till, deviceid, app) 
            VALUES ('".$userid."', '".$token."', '".getDateTimeNow()."', '".getDateTimeAfterDays(AUTH_DAYS)."', '".$deviceid."', 'my')"
        )){
            return $token;
        }
    }
    return false;
}


function getForms( $authtoken, $search, $startDate, $endDate, $offset ) {
    $limit = 20;
    $offset = $offset * $limit;
    $result = sqlQuery(
        "SELECT f.id, f.userid, u1.fio, f.address, f.checksCountTotal, f.failChecksCountTotal, f.date_insert, f.apartment_num, f.customer 
        FROM forms f
        JOIN users u1 ON f.userid = u1.id
        JOIN users u2 ON u2.accountid = u1.accountid 
        JOIN auth ON u2.id = auth.userid 
        WHERE 
            auth.token = '{$authtoken}'
            AND (
                f.address LIKE '%{$search}%' 
                OR f.customer LIKE '%{$search}%' 
                OR f.id LIKE '%{$search}%'
            ) 
            AND f.date_insert >= '{$startDate}' 
            AND f.date_insert <= '{$endDate}'
        ORDER BY f.date_insert DESC 
        LIMIT {$limit}
        OFFSET {$offset}"
    );
    if ($result->num_rows > 0) { 
        while($row = $result->fetch_assoc()) {
            $forms[] = [
                'id' =>  $row["id"],
                'address' =>  $row["address"],
                'fio' =>  $row["fio"],
                'checksCountTotal' =>  $row["checksCountTotal"],
                'failChecksCountTotal' =>  $row["failChecksCountTotal"],
                'timestamp' =>  $row["date_insert"],
                'apartmentNum' =>  $row["apartment_num"],
                'customer' =>  $row["customer"],
            ];
        };
    };
    return $forms;
}

function getFormsCount( $authtoken) {
    $result = sqlQuery(
        "SELECT u1.id,
            SUM((SELECT COUNT(id) FROM forms WHERE userid IN (u1.id) AND DATEDIFF(NOW(), date_insert)<1)) as count_today,
            SUM((SELECT COUNT(id) FROM forms WHERE userid IN (u1.id) AND date_insert>=DATE_FORMAT(NOW(), '%Y-%m-01'))) as count_month,
            SUM((SELECT COUNT(id) FROM forms WHERE userid IN (u1.id) AND DATEDIFF(NOW(), date_insert)<7)) as count_7days,
            SUM((SELECT COUNT(id) FROM forms WHERE userid IN (u1.id) AND DATEDIFF(NOW(), date_insert)<30)) as count_30days
        FROM  users u1
        JOIN users u2 ON u2.accountid = u1.accountid 
        JOIN auth ON u2.id = auth.userid 
        WHERE auth.token = '{$authtoken}'"
    );
    if ($result->num_rows > 0) { 
        return $result->fetch_assoc();
    };
    return $forms;
}

function getForm( $authtoken, $id ) {
    $result = sqlQuery(
        "SELECT f.*, u1.fio
        FROM forms f
        JOIN users u1 ON f.userid = u1.id
        JOIN users u2 ON u2.accountid = u1.accountid 
        JOIN auth ON u2.id = auth.userid 
        WHERE 
            auth.token = '{$authtoken}'
            AND f.id = '{$id}'
        LIMIT 1"
    );

    if ($result->num_rows > 0) { 
        $row = $result->fetch_assoc();
        return [
            'id' =>  $row["id"],
            'address' =>  $row["address"],
            'fio' =>  $row["fio"],
            'form' =>  $row["form"],
            'checksCountTotal' =>  $row["checksCountTotal"],
            'failChecksCountTotal' =>  $row["failChecksCountTotal"],
            'timestamp' =>  $row["date_insert"],
            'apartmentNum' =>  $row["apartment_num"],
            'customer' =>  $row["customer"],
        ];
    } else {
        return $form;
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

function getPlans() {
    $plans = [];
    $result = sqlQuery(
        "SELECT * 
        FROM plans 
        WHERE is_public = 1 and id > 1
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

function getPlan( $authtoken ) {
    $result = sqlQuery(
        "SELECT p.id, p.name, p.limit_users, p.limit_forms_per_month, b.date_plan_end, DATEDIFF(b.date_plan_end, NOW()) as days_left
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

function getAccountPlanId($authtoken) {
    $result = sqlQuery(
        "SELECT ac.planid
        FROM accounts ac
        JOIN users u ON u.accountid = ac.id
        JOIN auth au ON au.userid = u.id
        WHERE au.token = '{$authtoken}' 
        LIMIT 1"
    );
    if ($result->num_rows > 0) { 
        $row = $result->fetch_assoc();
        return $row["planid"];
    } else {
        return false;
    }
}

function createPayment($authtoken) {
    $result = sqlQuery( 
        "SELECT ac.id as account_id, u.username, ac.planid, p.price as plan_price, p.name as plan_name
            FROM plans p
            JOIN accounts ac ON p.id = ac.planid
            JOIN users u ON ac.id = u.accountid
            JOIN auth au ON au.userid = u.id
            WHERE au.token = '{$authtoken}'"
    );
    if ($result->num_rows > 0) { 
        $row = $result->fetch_assoc();
        
        $now = substr(getDateTimeNow(), 0, 19);
        $date_after_30 = substr(getDateAfter1Month(), 0, 19);
        $description = 'Оплата доступа к системе Приёмка Про по тарифу "'.$row["plan_name"].'" для аккаунта #'.$row["account_id"].' на период с '.date('d.m.y', strtotime($now)).' по '.date('d.m.y', strtotime($date_after_30));
        $billing_id = sqlQuery( 
            "INSERT 
            INTO billing (accountid, useremail, planid, sum, date_insert, date_plan_start, date_plan_end, payment_provider, status, paid, invoice_subject)
            VALUES ('{$row["account_id"]}', '{$row["username"]}', '{$row["planid"]}', '{$row["plan_price"]}', '{$now}', '{$now}', '{$date_after_30}', 'yookassa', 'draft', 0, '{$description}' )"
        );
        if ($billing_id){
            return [
                'billing_id'=>$billing_id, 
                'description'=>$description, 
                'account_id'=>$row["account_id"], 
                'value'=>$row["plan_price"]
            ];
        }
    } 
    return false;
}


function CheckOnSignUpAuthToken($username,$authtoken) {
    $result = sqlQuery(
        "SELECT u.id
        FROM users u
        JOIN auth a ON a.userid = u.id
        WHERE a.token = '{$authtoken}' AND u.username = '{$username}'
        LIMIT 1"
    );
    return $result->num_rows > 0;
}

function getSourceContent( $vesion = ''){   // returns [ "content", "vesion" ]
    // get file path for latest active content form DB
    $select_result = sqlQuery(
        "SELECT file_path, id 
        FROM form_templates 
        WHERE id = '{$vesion}'
        ORDER BY id DESC 
        LIMIT 1"
    );
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
    return count($dictionary) > 0 ? $dictionary : false;
}

function getDictionaryByVersion( $version ){  
    $select_result = sqlQuery(
        "SELECT dictionary_path
        FROM form_templates
        WHERE id = '{$version}' 
        LIMIT 1"
    );
    if ($select_result->num_rows > 0) { 
        $template = $select_result->fetch_assoc();
        $dictionary_path = $template['dictionary_path'];
        $dictionary_json = file_get_contents($_SERVER['DOCUMENT_ROOT'].$dictionary_path);
        $dictionary_arr = json_decode($dictionary_json,true);
        // $dictionary_arr = (array)$dictionary_obj;
        return $dictionary_arr;
    } else {
        return false;
    }
}

// API ------------------------------------------------------------------------------------------------------------------

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header("Access-Control-Allow-Headers: X-Requested-With");

if (isset($_GET['method'])) {
    switch ($_GET['method']) {
        case "ping":
            phpinfo();
            // echo json_encode( ["result"=> 'pong']);
            break;

        case "login":
            $token = logIn($_POST['username'], $_POST['password'], $_POST['deviceid']);
            echo json_encode( ["result"=>$token!==false, "authtoken" => $token, '_POST' => $_POST] ); 
            break;
       
        case "getforms":
            $forms = getForms($_GET['authtoken'], $_GET['search'],$_GET['startDate'],$_GET['endDate'],$_GET['offset'] );
            echo json_encode( ['result'=> count($forms)>0, 'forms' => $forms] );
            break;
            
        case "getformscount":
            $formscount = getFormsCount($_GET['authtoken'] );
            echo json_encode( ['result'=> count($formscount)>0, 'formscount' => $formscount] );
            break;

        case "getform":
            $form = getForm($_GET['authtoken'], $_GET['formId'] );
            echo json_encode( ['result'=> $form!==false, 'form' => $form] );
            break;
            
        /* Users */
        case "getusers":
            $users = getUsers($_GET['authtoken'], $_GET['search']);
            echo json_encode( ['result'=> count($users)>0, 'users' => $users ] );
            break;
                
        case "getuser":
            $user = getUser($_GET['authtoken'], $_GET['userId'] );
            echo json_encode( ['result'=> $user!==false, 'user' => $user] );
            break;

        case "getuserfiles":
            $userfiles = getUserFiles($_GET['authtoken'], $_GET['userId'] );
            echo json_encode( ['result'=> $userfiles!==false, 'userfiles' => $userfiles] );
            break;

        case "adduser":
            $userid = addUser($_GET['authtoken'], $_POST['username'], $_POST['fio']);
            echo json_encode( ['result'=> $userId!==false, 'userid' => $userid ] );
            break;
    
        case "postuser":
            $result = postUser($_GET['authtoken'], $_POST['userId'], $_POST['fio'], $_POST['comment'], $_POST['equipment'], $_POST['userfiles'], $_POST['is_active'] );
            echo json_encode( ['result'=> $result!==false] );
            break;
                
        case "postuserfiles":
            $result = postUserFiles($_GET['authtoken'], $_POST['userId'], $_POST['userfiles']);
            echo json_encode( ['result'=> $result!==false] );
            break;
                
        case "removeuserfile":
            $result = removeUserFile($_GET['authtoken'], $_POST['userId'], $_POST['userfiles'],  $_POST['filetoremove']);
            echo json_encode( ['result'=> $result!==false] );
            break;
                
        case "uploaduserfile":
            $files_json = saveUploadedUserFile( $_GET['authtoken'], $_POST['userid'], $_POST["filename"], $_FILES['file'] );
            echo json_encode( Array("result" => $files_json!==false , "files" => $files_json) );
            break;

        /* Settings */
        case "getaccount":
            $account = getAccount($_GET['authtoken']);
            echo json_encode( ['result'=> $account!==false, 'account' => $account ] );
            break;
        
        case "postaccount":
            $result = postAccount($_GET['authtoken'], $_POST['name'], $_POST['location'], $_POST['requisites'] );
            echo json_encode( ['result'=> $result!==false, '_POST'=> $_POST ] );
            break;
    

        case "uploadaccountfile":
            $files_json = saveUploadedAccountFile( $_GET['authtoken'], $_POST["filename"], $_FILES['file'], $_POST['type'] );
            echo json_encode( Array("result" => $files_json!==false , "files" => $files_json) );
            break;

        case "postattachmentfiles":
            $result = postAttachmentFiles($_GET['authtoken'], $_POST['attachmentfiles']);
            echo json_encode( ['result'=> $result!==false] );
            break;

        case "removeattachmentfile":
            $result = removeAttachmentFile($_GET['authtoken'], $_POST['attachmentfiles'],  $_POST['filetoremove']);
            echo json_encode( ['result'=> $result!==false] );
            break;


        case "gettemplates":
            $templates = getTemplates($_GET['authtoken']);
            echo json_encode( ['result'=> $templates!==false, 'templates' => $templates ] );
            break;


        case "updatetemplate":
            // $result = updateFormTemplate($_GET['authtoken']); 
            $template_id = updateFormTemplate($_GET['authtoken'], $_POST['source'], $_POST['dictionary'], $_POST['form']); 

            echo json_encode( ['result' => $template_id!==false, 'template_id' => $template_id, 'dictionary' => $_POST['dictionary']] );
            break;

        case "reversetemplate":
            $result = reverseFormTemplate($_GET['authtoken'], $_POST["deactivate_id"]);
            echo json_encode( ['result'=> $result!==false] );
            break;
            
        case "getplans":
            $plans = getPlans();
            echo json_encode( ["result"=>$plans!==false, 'plans'=>$plans]);
            break;
        
        case "getaccountplan":
            $plan = getPlan( $_GET['authtoken'] );
            echo json_encode( ["result"=>$plans!==false, 'plan'=>$plan]); 
            break;
        
        case "createpayment":
            $payment = createPayment($_GET['authtoken']); 
            echo json_encode( ['result' => $payment!==false, 'payment' => $payment] );
            break;
            
        case "updatepayment":
            $result = updatePayment( 
                $_POST['id'], 
                $_POST['deviceid'], 
                $_POST['paid'], 
                $_POST['status'], 
                $_POST['provider_id']
            );
            echo json_encode( ['result' => $result ] );
            // botSendMessage( "Yookassa updatepayment:", '4371506' );
            // botSendMessage( "💰 ".$_POST['status']." ".$_POST['deviceid']." id:".$_POST['id'], '4371506' );
            break;
      
        case "recoverypasswordrequest":
            $result = RecoveryPasswordRequest($_GET['username']);
            echo json_encode( ['result' => $result ] );
            break;
      
        case "changepassword":
            $result = ChangePassword( $_POST['password_recovery_hash'], $_POST['password'],  );
            echo json_encode( ['result' => $result ] );
            break;
      
        case "checkonsignupauthtoken":
            $result = CheckOnSignUpAuthToken( $_POST['username'], $_POST['authtoken'] );
            echo json_encode( ['result' => $result ] );
            break;
            
        case "getdictionary":
            if (isset($_GET['version'])){
                $sourceContent = getSourceContent( $_GET['version'] );
                $dictionary = getDictionary( $sourceContent["content"] );
                // $dictionary = getDictionaryByVersion( $_GET['version'] );
                echo json_encode( ["result" => $dictionary!==false, "dictionary" => $dictionary ] );
            } else {
                echo json_encode( ["result" => false , "error" => "What is local version?" ] );
            }
            break;

        default:
            echo json_encode( Array("error" => "Unknown method") ); 
            break;
    }
}

//------------------------------------------------------------------------------------------------------------------------

?>