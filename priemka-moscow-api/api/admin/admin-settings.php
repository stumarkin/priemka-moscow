<? 
/**
 * @author Sergey Tumarkin https://tumarkin.me
 */

 function getAccount( $authtoken ) {
    $result = sqlQuery(
        "SELECT accounts.*
        FROM accounts
        JOIN users ON accounts.id = users.accountid
        JOIN auth ON users.id = auth.userid
        WHERE auth.token = '{$authtoken}'
        LIMIT 1"
    );
    if ($result->num_rows > 0) { 
        return $result->fetch_assoc();
    } else {
        return false;
    }
}

function postAccount( $authtoken, $name, $location, $requisites ) {
    return sqlQuery(
        "UPDATE accounts
        JOIN users ON accounts.id = users.accountid 
        JOIN auth ON users.id = auth.userid
        SET 
            accounts.name = '{$name}',
            accounts.location = '{$location}',
            accounts.requisites = '{$requisites}'
        WHERE auth.token = '{$authtoken}'"
    );
}

function saveUploadedAccountFile( $authtoken, $filename, $file, $type) {
    // if $type == "attachment" then save to cusctom dir and support multifiles.
    $accountid = getAccountIdByAuthtoken($authtoken);
    $root = $_SERVER['DOCUMENT_ROOT'];
    $account_dir = TARGET_ACCOUNTFILE_DIR.$accountid;
    $target_dir = $type=="attachment" ? $account_dir.'/attachment' : $account_dir;
    $filename = '/'.$filename;
    
    if(empty($file['name'])){
      $status = "File not found";
    } else if (file_exists( $root.$target_dir.$filename )) {
      $status = "File already exists";
    } else if ( $file["size"] > 5000000 ) {
      $status = "File is too large";
    } else if ( !(is_dir($root.$account_dir) || mkdir($root.$account_dir))){
        $status = "Error mkdir {$root}{$account_dir}";
    } else if ( !(is_dir($root.$target_dir) || mkdir($root.$target_dir))){
        $status = "Error mkdir {$root}{$target_dir}";
    } else if ( !move_uploaded_file( $file["tmp_name"], $root.$target_dir.$filename ) ){
        $status = "Error move_uploaded_file {$root}{$target_dir}{$filename}";
    } else {
        if ($type=="attachment") {
            $files_json = getAttachmentFiles($authtoken);
            $files = json_decode($files_json);
            $files[] = $target_dir.$filename;
            $files_json = json_encode($files);
            if (postAttachmentFiles($authtoken, $files_json)){
                return $files_json;
            } else {
                return false;
            }
        } else {

            if (postAccountFile($authtoken, $target_dir.$filename, $type)){
                return $target_dir.$filename;
            } else {
                return false;
            }
        }
    } 
    
    return false;
    // TBD Log error somehow

 }


 function getAttachmentFiles( $authtoken ) {
    $result = sqlQuery(
        "SELECT accounts.attachmentfiles
        FROM accounts
        JOIN users ON accounts.id = users.accountid 
        JOIN auth ON users.id = auth.userid
        WHERE 
            auth.token = '{$authtoken}'
        LIMIT 1"
    );
    if ($result->num_rows > 0) { 
        $row = $result->fetch_assoc();
        return $row["attachmentfiles"];
    } else {
        return false;
    }
}

function postAttachmentFiles( $authtoken, $attachmentfiles_json ) {
    return sqlQuery(
        "UPDATE accounts
        JOIN users ON accounts.id = users.accountid 
        JOIN auth ON users.id = auth.userid
        SET accounts.attachmentfiles = '{$attachmentfiles_json}'
        WHERE auth.token = '{$authtoken}'"
    );
}

function postAccountFile( $authtoken, $file, $type ) {
    return sqlQuery(
        "UPDATE accounts
        JOIN users ON accounts.id = users.accountid 
        JOIN auth ON users.id = auth.userid
        SET accounts.{$type} = '{$file}'
        WHERE auth.token = '{$authtoken}'"
    );
}

function removeAttachmentFile( $authtoken, $attachmentfiles_json, $filetoremove ) {
    if ( unlink( $_SERVER['DOCUMENT_ROOT'].$filetoremove ) ){
        return sqlQuery(
            "UPDATE accounts
            JOIN users ON accounts.id = users.accountid 
            JOIN auth ON users.id = auth.userid
            SET accounts.attachmentfiles = '{$attachmentfiles_json}'
            WHERE auth.token = '{$authtoken}'"
        );
    } else {
        return false;
    }
}

function getTemplates( $authtoken ) {
    $result = sqlQuery(
        "SELECT ac.googlesheets_edit, ft.*
        FROM accounts ac
        JOIN form_templates ft ON ft.accountid = ac.id
        JOIN users u ON ac.id = u.accountid
        JOIN auth au ON u.id = au.userid
        WHERE 
            au.token = '{$authtoken}' 
        ORDER BY id DESC
        LIMIT 100"
    );
    if ($result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            $templates[] = $row;
        }; 
        return $templates;
    } else {
        return false;
    }
}

function updateFormTemplate($authtoken){
    $result = sqlQuery(
        "SELECT ac.googlesheets_csv, ac.id
        FROM accounts ac
        JOIN users u ON ac.id = u.accountid
        JOIN auth au ON u.id = au.userid
        WHERE au.token = '{$authtoken}' 
        LIMIT 1"
    );
    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $googlesheets_csv = $row["googlesheets_csv"];
        $accountid = $row["id"];

        $root = $_SERVER['DOCUMENT_ROOT'];
        $account_dir = TARGET_ACCOUNTFILE_DIR.$accountid;
        $target_dir = $account_dir.'/templates';
        $filepath = $root.$target_dir.'/template_'.$accountid.'_'.time().'.csv';
        
        
        if (!(is_dir($root.$account_dir) || mkdir($root.$account_dir))){
            $status = "Error mkdir {$root}{$account_dir}";
        } else if (!(is_dir($root.$target_dir) || mkdir($root.$target_dir))){
            $status = "Error mkdir {$root}{$target_dir}";
        } else {
            $content = file_get_contents($googlesheets_csv);
            $file_put_result = file_put_contents( $filepath, $content );
            if ( $file_put_result ){
                return sqlQuery("INSERT 
                                INTO form_templates (accountid, file_path, date_insert) 
                                VALUES ('{$accountid}', '{$filepath}', '".getDateTimeNow()."')");
            } else {
                return $file_put_result ;
            }
        }
        return $status ;
    } else {
        return false;
    }
    
}

function reverseFormTemplate($authtoken, $deactivate_id){
    return sqlQuery(
        "UPDATE form_templates ft
        JOIN accounts ac ON ft.accountid = ac.id
        JOIN users u ON ac.id = u.accountid
        JOIN auth au ON u.id = au.userid
        SET ft.is_active = 0
        WHERE au.token = '{$authtoken}' AND ft.id='{$deactivate_id}'"
    );
}

 ?>