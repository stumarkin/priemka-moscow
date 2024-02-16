<?
/**
 * @author Sergey Tumarkin https://tumarkin.me
 */

require_once( dirname(__DIR__)."/config.php" );
require_once( dirname(__DIR__)."/shared.functions.php" );

function getForms( $userid ) {
    $banners = [];
    $result = sqlQuery("SELECT id, address, checksCountTotal, failChecksCountTotal, date_insert, apartment_num, customer FROM forms ORDER BY date_insert DESC LIMIT 100");
    if ($result->num_rows > 0) { 
        while($row = $result->fetch_assoc()) {
            $forms[] = [
                'id' =>  $row["id"],
                'address' =>  $row["address"],
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

function getUsers( ) {
    $users = [];
    $result = sqlQuery("SELECT id,username,is_admin,date_insert,last_login,comment,deviceid FROM users ORDER BY last_login DESC LIMIT 100");
    if ($result->num_rows > 0) { 
        while($row = $result->fetch_assoc()) {
            $users[] = $row;
        };
    };
    return $users;
}

function updateSource(){
    $url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQSAhUBqqDeeTlMWzM8wcLPZWMYCoWZmP0i9EkGbYAcASC_7cfwsmXZLSnXGruCDabSbJcCg0Hr_Sen/pub?gid=1623387219&single=true&output=csv';
    // edit https://docs.google.com/spreadsheets/d/1A9WBf3rhws8rpHpAPEH7bH1buPILrEU4Rpb49nNRPHI/edit#gid=1623387219
    $sourceSourceContent = file_get_contents($url);
    $file_path = dirname(__DIR__).'/source/sourceContent'.time().'.csv';
    $file_put_res = file_put_contents( $file_path, $sourceSourceContent );
    if ( $file_put_res ){
        return sqlQuery("INSERT 
                            INTO form_templates (
                                    file_path, 
                                    date_insert
                                ) 
                            VALUES (
                                    '".$file_path."', 
                                    '".getDateTimeNow()."'
                                )"
        );

    } else {
        return $file_put_res ;
    }
}

// API ------------------------------------------------------------------------------------------------------------------

header('Access-Control-Allow-Origin: *');

header('Access-Control-Allow-Methods: GET, POST');

header("Access-Control-Allow-Headers: X-Requested-With");

if (isset($_GET['method'])) {
    switch ($_GET['method']) {
        case "ping":
            echo json_encode( ["result"=> 'pong']);
            break;

        case "signin":
            $user = signin($_POST['username'], $_POST['password'], $_POST['deviceid'],);
            echo json_encode( $user ? ["result"=>true, "user" => $user ] : ["result"=>false] );
            break;
       
        case "getforms":
            $forms = getForms($_GET['userid']);
            echo json_encode( ['result'=> count($forms)>0, 'forms' => $forms ] );
            break;

        case "getusers":
            $users = getUsers();
            echo json_encode( ['result'=> count($users)>0, 'users' => $users ] );
            break;

        case "updatesource":
            $res = updateSource();
            echo json_encode( ['result'=> $res] );
            break;
       
        default:
            echo json_encode( Array("error" => "Unknown method") ); 
            break;
    }
}

//------------------------------------------------------------------------------------------------------------------------

?>