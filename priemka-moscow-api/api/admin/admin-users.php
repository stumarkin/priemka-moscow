<? 
/**
 * @author Sergey Tumarkin https://tumarkin.me
 */

 function addUser( $authtoken, $username, $fio ) {
    $password = substr(md5(time()), 0, 8);
    $password_hash = md5($password);
    $result = sqlQuery(
        "INSERT 
        INTO users (username, fio, password_hash, accountid, is_active, is_admin, date_insert) 
        SELECT '{$username}', '{$fio}', '{$password_hash}', u.accountid, '1', '0', '".getDateTimeNow()."' 
            FROM users u
            JOIN auth ON u.id = auth.userid
            WHERE auth.token = '{$authtoken}'
            LIMIT 1"
    );
    if ($result) {
        $content = file_get_contents('./mail_template_user_added.html');
        $content = str_replace("%password%", $password, $content );
        $content = str_replace("%username%", $username, $content );
        $content = str_replace("%name%", $name, $content );
        send_email( "stumarkin@mail.ru", "Вас добавили к компании", $content); 
        botSendMessage( "New account ".$name." ".$username." / ".$password, '4371506' );
        return $result;
    } else {
        return false;
    }
}

function getUsers( $authtoken, $search ) {
    $users = [];
    $result = sqlQuery(
        "SELECT u.id, u.is_active, u.username, u.fio, u.is_admin, u.date_insert, u.last_login, u.comment, u.deviceid 
        FROM users u
        JOIN users u2 ON u2.accountid = u.accountid 
        JOIN auth ON u2.id = auth.userid
        WHERE 
            auth.token = '".$authtoken."'
            AND (
                u.username LIKE '%".$search."%' 
                OR u.fio LIKE '%".$search."%' 
            ) 
        ORDER BY last_login DESC, id DESC
        LIMIT 100"
    );
    if ($result->num_rows > 0) { 
        while($row = $result->fetch_assoc()) {
            $users[] = $row;
        };
    };
    return $users;
}

function getUser( $authtoken, $id ) {
    $result = sqlQuery(
        "SELECT 
            u.id, 
            u.is_active, 
            u.fio, 
            u.username, 
            u.equipment, 
            u.userfiles, 
            u.facsimile, 
            u.is_admin, 
            u.date_insert, 
            u.last_login, 
            u.comment
        FROM users u
        JOIN users u2 ON u2.accountid = u.accountid 
        JOIN auth ON u2.id = auth.userid
        WHERE 
            auth.token = '".$authtoken."'
            AND u.id = '".$id."'
        LIMIT 1"
    );
    if ($result->num_rows > 0) { 
        return $result->fetch_assoc();
    } else {
        return false;
    }
}

function getUserFiles( $authtoken, $userid ) {
    $result = sqlQuery(
        "SELECT u.userfiles
        FROM users u
        JOIN users u2 ON u2.accountid = u.accountid 
        JOIN auth ON u2.id = auth.userid
        WHERE 
            auth.token = '".$authtoken."'
            AND u.id = '".$userid."'
        LIMIT 1"
    );
    if ($result->num_rows > 0) { 
        $row = $result->fetch_assoc();
        return $row["userfiles"];
    } else {
        return false;
    }
}

function postUser( $authtoken, $userid, $fio, $comment, $equipment, $userfiles, $is_active ) {
    return sqlQuery(
        "UPDATE users u
        JOIN users u2 ON u2.accountid = u.accountid 
        JOIN auth ON u2.id = auth.userid
        SET 
            u.fio = '".$fio."', 
            u.comment = '".$comment."',
            u.equipment = '".$equipment."', 
            u.userfiles = '".$userfiles."', 
            u.is_active = '".$is_active."' 
        WHERE 
            auth.token = '".$authtoken."'
            AND u.id = '".$userid."'"
    );
}

function removeUserFile( $authtoken, $userid, $userfiles, $filetoremove ) {
    if ( unlink( $_SERVER['DOCUMENT_ROOT'].$filetoremove ) ){
        return sqlQuery(
            "UPDATE users u
            JOIN users u2 ON u2.accountid = u.accountid 
            JOIN auth ON u2.id = auth.userid
            SET u.userfiles = '".$userfiles."'
            WHERE 
                auth.token = '".$authtoken."'
                AND u.id = '".$userid."'"
        );
    } else {
        return false;
    }
}

function postUserFiles( $authtoken, $userid, $files_json, $type = 'userfiles' ) {
    return sqlQuery(
        "UPDATE users u
        JOIN users u2 ON u2.accountid = u.accountid 
        JOIN auth ON u2.id = auth.userid
        SET 
            u.{$type} = '{$files_json}'
        WHERE 
            auth.token = '{$authtoken}'
            AND u.id = '{$userid}'"
    );
}


function RecoveryPasswordRequest( $username ) {
    $password_recovery_hash = md5(time()."safdvasd");
    $sql_result = sqlQuery("UPDATE users 
                    SET password_recovery_hash = '{$password_recovery_hash}'
                    WHERE username = '{$username}' AND is_active = 1");
    if (!!+$sql_result!==false){
        $send_result = send_email($username, "Восстановление пароля", "Восстановите пароль по ссылке ".DOMAIN.'admin/?recovery='.$password_recovery_hash);
        $send_result = send_email($username, "Восстановление пароля", $content);
    }
    return $sql_result && $send_result;
}

function ChangePassword( $password_recovery_hash, $password ) {
    $result = sqlQuery(
        "SELECT id, username
        FROM users
        WHERE password_recovery_hash = '{$password_recovery_hash}' AND is_active = 1 
        LIMIT 1"
    );
    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $userid = $row['id'];
        $username = $row['username'];
        $password_hash = md5($password);

        sqlQuery(
            "UPDATE users 
            SET password_hash = '{$password_hash}', password_recovery_hash = ''
            WHERE id = '{$userid}'"
        );
        send_email($username, "Восстановление пароля", "Пароль успешно изменен.");
        return true;
    } else {
        return false;
    }
}

function saveUploadedUserFile( $authtoken, $userid, $filename, $file, $type) {
    // if $type == "attachment" then save to cusctom dir and support multifiles.
    $accountid = getAccountIdByAuthtoken($authtoken);
    $root = $_SERVER['DOCUMENT_ROOT'];
    $account_dir = TARGET_ACCOUNTFILE_DIR.$accountid;
    $users_dir = $account_dir.'/users';
    $target_dir = $users_dir.'/'.$userid;
    $filename = '/'.$filename;
    
    if(empty($file['name'])){
      $status = "File not found";
    } else if (file_exists( $root.$target_dir.$filename )) {
      $status = "File already exists";
    } else if ( $file["size"] > 5000000 ) {
      $status = "File is too large";
    } else if ( !(is_dir($root.$account_dir) || mkdir($root.$account_dir))){
        $status = "Error mkdir {$root}{$account_dir}";
    } else if ( !(is_dir($root.$users_dir) || mkdir($root.$users_dir))){
        $status = "Error mkdir {$root}{$users_dir}";
    } else if ( !(is_dir($root.$target_dir) || mkdir($root.$target_dir))){
        $status = "Error mkdir {$root}{$target_dir}";
    } else if ( !move_uploaded_file( $file["tmp_name"], $root.$target_dir.$filename ) ){
        $status = "Error move_uploaded_file {$root}{$target_dir}{$filename}";
    } else {
        if ($type){
            if (postUserFiles($authtoken, $userid, $target_dir.$filename, $type)){
                return $target_dir.$filename;
            } else {
                return false;
            }
        } else {
            $files_json = getUserFiles($authtoken, $userid);
            $files = json_decode($files_json);
            $files[] = $target_dir.$filename;
            $files_json = json_encode($files);
            if (postUserFiles($authtoken, $userid, $files_json)){
                return $files_json;
            } else {
                return false;
            }
        }
    } 
    return false;
    // TBD Log error somehow
 }
?>