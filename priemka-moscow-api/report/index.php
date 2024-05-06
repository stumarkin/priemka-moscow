<?php
/**
 * @author Sergey Tumarkin https://tumarkin.me
 */


require_once("../api/v4/index.php");

$dictionary = [];

function getFormForReport($id) {
    $result = sqlQuery(
        "SELECT
            f.*, 
            ac.logo, 
            ac.requisites, 
            ac.location, 
            ac.stamp, 
            ac.attachmentfiles, 
            u.fio, 
            u.equipment, 
            u.facsimile, 
            u.userfiles
        FROM accounts ac
        JOIN users u on ac.id = u.accountid
        JOIN forms f on u.id = f.userid
        WHERE f.id='{$id}'
        LIMIT 1"
    );
    if ($result->num_rows > 0) {
        return $result->fetch_assoc();
    } else {
        return false;
    }
}

function getPlanId( $id ) {
    $result = sqlQuery(
        "SELECT p.id
        FROM billing b
        JOIN plans p ON b.planid = p.id
        JOIN accounts ac ON b.accountid = ac.id
        JOIN users u ON u.accountid = ac.id
        JOIN forms f ON f.userid = u.id
        WHERE f.id = '{$id}' AND paid=1
        ORDER BY date_plan_end DESC
        LIMIT 1"
    );
    if ($result->num_rows > 0) { 
        $row = $result->fetch_assoc();
        return $row['id'];
    } else {
        return false;
    }
}

function getName( $obj, $isExpertMode ) { 
    global $dictionary;
    $comment = $obj->comment ? "<br><br>Примечание:<br>".str_replace("\n", "<br>", $obj->comment) : "";  
    $image = $obj->image ? "<br><img src='".$obj->image."' style='width: 400px'/>" : "";  

    if ($dictionary[$obj->id]["report"]) {
        $td1 = $dictionary[$obj->id]["report"].$comment.$image;
        $td2 = $isExpertMode ? $dictionary[$obj->id]["clause"] : "";
    } else {
        $td1 = ($obj->name ? $obj->name : $dictionary[ ($obj->templateId ? $obj->templateId : $obj->id) ]['name']).$image;
    }
    return !$isExpertMode ? "<td colspan=2>".$td1."</td>" : "<td>".$td1."</td><td>".$td2."</td>";
}


function formToHtml ($node, $isExpertMode,  $level=1, &$counterThrough=1, $counter=1){
    $str = '';
    if (isset($node->nested)) {
        $i=1;
        foreach ($node->nested as $nested_node){
            $str .= formToHtml ($nested_node, $isExpertMode, $level+1, $counterThrough, $i++);
        }
        if ($node->comment && $level==1) {
            $comment = count( explode("<br>", $node->comment) ) > 1 ? "<ul><li>".implode("</li><li>", explode("<br>", $node->comment))."</li></ul>" : $node->comment;
            $comment =  "<tr class='h6 ms-2 mt-2 mb-0'><td></td><td>Общие недостатки</td><td></td></tr> <tr><td>".$counterThrough++."</td><td>".$comment."</td><td></td></tr>";
        }
            
            
        if ($str || $comment) {
            return "<tr class='h".(4+$level)." ms-2 mt-2 mb-0 ".($level==1 ? 'table-secondary' : 'table-light')."'><td></td>".getName($node, $isExpertMode )."</tr>".$str.$comment;
        }
    } else if ($node->value!==true) {
        $str .= "<tr><td class='ms-4'>"
            .$counterThrough++.". ".getName($node, $isExpertMode )
            .($node->value!==false ? "<div class='ms-2'>".$node->value."</div>" : '' )
            ."</td></tr>";
    }
    return $str;
}

// function displayImages($directory) {
//     // Проверяем существует ли директория
//     if (!is_dir($directory)) {
//         echo "Указанная директория не существует.";
//         return;
//     }

//     // Получаем список файлов в директории
//     $files = scandir($directory);

//     // Проходим по каждому файлу
//     foreach ($files as $file) {
//         // Проверяем, является ли файл изображением
//         $extension = pathinfo($file, PATHINFO_EXTENSION);
//         $imageExtensions = array("jpg", "jpeg", "png", "gif");
//         if (in_array(strtolower($extension), $imageExtensions)) {
//             // Выводим изображение в HTML
//             echo '<img class="mt-5" style="max-width: 700px" src="' . $directory . '/' . $file . '" alt="' . $file . '">';
//         }
//     }
// }

function getParamFromUrl ($url, $what = 'id') {
    $pattern = "/\/([^\/?]+)\/([^\/?]+)(?:\?|$)(.*)/";
    // Выполнить поиск с помощью preg_match()
    if (preg_match($pattern, $url, $matches)) {
        $id = $matches[2];
        parse_str( $matches[3], $queryParams);
       return $what == 'id' ? $id : $queryParams;
    } else {
       return false;
    }
}

function getDictionaryByVersion( $version ){   // returns vesion : integer
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

if ($id = getParamFromUrl($_SERVER['REQUEST_URI'])){
    
    $queryParams = getParamFromUrl($_SERVER['REQUEST_URI'], 'params');
    $isExpertMode = array_key_exists('expert', $queryParams);

    $form = getFormForReport($id);
    // $isExpertMode = 1;
    $form_form = json_decode( str_replace("\n", "<br>", $form['form']) );
    
    global $dictionary;

    
    //deprecated if
    // if ($form_form->formTemplateVersion > 110 || $form_form->formTemplateVersion == 1){
    if (strlen($form['authtoken'])>0){
        $dictionary = getDictionaryByVersion($form_form->formTemplateVersion);
    } else {
        //deprecated
        $sourceContent = getSourceContent($form_form->formTemplateVersion);
        $dictionary = getDictionary( $sourceContent["content"] ) ;
    }

    $planid = getPlanId($id);

    $formHtml = '';
    foreach ($form_form->apartment as $room){
        $formHtml .= formToHtml ($room, $isExpertMode );
    }
    $address = $form['address'];
    $date_insert = date("d/m/Y", strtotime($form['date_insert']) );
    $customer = $form['customer'];
    $specialist = $form['specialist'];

    $logo = $form['logo'];
    $requisites = nl2br( $form['requisites'] );
    $location = $form['location'];
    $stamp = $form['stamp'];
    $facsimile = $form['facsimile'];
    $attachmentfiles = JSON_decode( $form['attachmentfiles']);
    $fio = $form['fio'];
    $equipment = nl2br($form['equipment']);
    $userfiles = JSON_decode($form['userfiles']);

    $apartment_num = $form['apartment_num'];
    // amplitudeSendEvent ($id, 'report-open');
} else {
    header("HTTP/1.0 404 Not Found");
    die();
}
?><!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossorigin="anonymous">
    <link rel="icon" type="image/x-icon" href="/assets/favicon.ico" />
    <title><?=$address?> - Приёмка Про</title>
    <script type="text/javascript">
        (function(e,t){var n=e.amplitude||{_q:[],_iq:{}};var r=t.createElement("script")
        ;r.type="text/javascript"
        ;r.integrity="sha384-MBHPie4YFudCVszzJY9HtVPk9Gw6aDksZxfvfxib8foDhGnE9A0OriRHh3kbhG3q"
        ;r.crossOrigin="anonymous";r.async=true
        ;r.src="https://cdn.amplitude.com/libs/amplitude-8.16.1-min.gz.js"
        ;r.onload=function(){if(!e.amplitude.runQueuedFunctions){console.log(
        "[Amplitude] Error: could not load SDK")}};var s=t.getElementsByTagName("script"
        )[0];s.parentNode.insertBefore(r,s);function i(e,t){e.prototype[t]=function(){
        this._q.push([t].concat(Array.prototype.slice.call(arguments,0)));return this}}
        var o=function(){this._q=[];return this};var a=["add","append","clearAll",
        "prepend","set","setOnce","unset","preInsert","postInsert","remove"];for(
        var c=0;c<a.length;c++){i(o,a[c])}n.Identify=o;var l=function(){this._q=[]
        ;return this};var u=["setProductId","setQuantity","setPrice","setRevenueType",
        "setEventProperties"];for(var p=0;p<u.length;p++){i(l,u[p])}n.Revenue=l;var d=[
        "init","logEvent","logRevenue","setUserId","setUserProperties","setOptOut",
        "setVersionName","setDomain","setDeviceId","enableTracking",
        "setGlobalUserProperties","identify","clearUserProperties","setGroup",
        "logRevenueV2","regenerateDeviceId","groupIdentify","onInit","onNewSessionStart"
        ,"logEventWithTimestamp","logEventWithGroups","setSessionId","resetSessionId",
        "getDeviceId","getUserId","setMinTimeBetweenSessionsMillis",
        "setEventUploadThreshold","setUseDynamicConfig","setServerZone","setServerUrl",
        "sendEvents","setLibrary","setTransport"];function v(t){function e(e){
        t[e]=function(){t._q.push([e].concat(Array.prototype.slice.call(arguments,0)))}}
        for(var n=0;n<d.length;n++){e(d[n])}}v(n);n.getInstance=function(e){e=(
        !e||e.length===0?"$default_instance":e).toLowerCase();if(
        !Object.prototype.hasOwnProperty.call(n._iq,e)){n._iq[e]={_q:[]};v(n._iq[e])}
        return n._iq[e]};e.amplitude=n})(window,document);

        amplitude.getInstance().init("f25a5c79e090b04161ab6d54246d390a");
        amplitude.getInstance().setUserId( "<?=$form['deviceid']?>" );
        amplitude.getInstance().logEvent("Report-View", {"isExpertMode": "<?=($isExpertMode ? true : false)?>"});
        </script>
    </script>
    <style>
        body {
            margin: 0;
            padding: 0;
            position: relative; /* Чтобы можно было позиционировать абсолютно */
        }
        .watermark {
            background-image: url('/report/assets/demo.bg.png');
        }
        @media print {
            .watermark {
                -webkit-print-color-adjust: exact; /* Для Chrome */
                background: url('/report/assets/demo.bg.png') repeat; /* Путь к изображению водяного знака */
            }
        }
    </style>
    </head>
<body class="bg-light">
    <div class="bg-white px-5 py-2 <?=($planid==1 ? "watermark" : "")?>" style="width: 210mm; margin: 0 auto;">
        <div class="row mt-5">
            <div class="col-4">
                <img src="<?=$logo?>" style="height:90px">
            </div>
            <div class="col-8 text-end small">
                <?=$requisites?>
                <!-- ООО «Ланс Групп» | тел. +7 (495) 777-91-44</br>
                <a href="e-mail:contacts@приемка.москва">contacts@приемка.москва</a> | <a href="https://xn--80ajijjph.xn--80adxhks/" target=_blank>https://приемка.москва</a></br>
                г. Москва, ул. Щепкина, д. 27, корп. 1, оф. 13</br>
                ОГРН 1187746101322 | ИНН/КПП 7702428456/770201001 -->
            </div>
        </div>  

        <div class="row mt-5">
            <div class="col h4 text-center">
                <?if ($isExpertMode) {?>
                    ТЕХНИЧЕСКОЕ ЗАКЛЮЧЕНИЕ ЭКСПЕРТА
                <?} else {?>
                    АКТ ОСМОТРА
                <?}?>
            </div>
        </div>  

        <div class="row mt-5">
            <div class="col-4">
                <?=$location?>
            </div>
            <div class="col-8 text-end small">
                <?=$date_insert?>
            </div>
        </div> 
        
        <div class="row mt-3 mb-3">
            <div class="col">
                Адрес: <strong><?=$address?>, <?=$apartment_num?></strong></br>
                Заказчик: <strong><?=$customer?></strong></br>
                Дата осмотра: <?=$date_insert?></br>
                Специалист: <?=$fio?>
            </div>
        </div> 

        <?if ($isExpertMode && strlen($equipment)>0) {?>
            <div class="row mb-4">
                <div class="col">
                    Перечень оборудования используемого при проведении осмотра:<br/>
                    <div class="mx-4">
                        <?=$equipment?>
                    </div>
                    <?/* <ol>
                        <li>Лазерный нивелир ADA CUBE 3-360 (погрешность нивелирования ±0,2мм/м)</li>
                        <li>Лазерный дальномер BOSCH GLM 500 (погрешность измерений ±1,5мм)</li>
                        <li>Линейка металлическая (0-300) мм</li>
                        <li>Детектор напряжения</li>
                        <li>Анемометр</li>
                        <li>Уровень строительный (0-1000) мм</li>
                        <li>Комплект ВИК (базовый)</li>
                        <li>Тепловизор Flir C3</li>
                    </ol> */?>
                </div>
            </div> 
        <?}?>
        
        <div class="row mt-2">
            <div class="col small">
                <table class="table">
                    <thead>
                        <tr class="table-dark">
                            <td>#</td>
                            <td>Помещение/выявленный дефект</td>
                            <td style="width:60%"><?=($isExpertMode ? "Примечание" : "")?></td>
                        </tr>
                    </thead>
                    <tbody class="table-group-divider">
                        <?=$formHtml?>
                    </tbody>
                </table>
            </div>
        </div>  

        <div style="page-break-inside: avoid;">
            <div class="row mt-2">
                <div class="col">
                    <img src="<?=$stamp?>" style="width: 200px; margin-left: 100px; position: absolute;">
                    <img src="<?=$facsimile?>" style="width: 200px; margin-left: 0px; position: absolute;"> 
                    <div class=" mt-5 pt-3">
                        <div class="d-flex justify-content-start mt-3 pt-3">
                            <div class="border-top border-dark text-center mx-2 flex-fill w-75" style=" margin-top: 20px; font-size: 8px;" >подпись / М.П. </div>
                            <div> / Специалист: <?=$fio?></div> 
                        </div>
                    </div>
                    <div class="mt-5 mb-5">
                            <?if ($isExpertMode) {?>
                                <b>Приложения:</b></br>
                                Приложение к заключению специалиста от <?=$date_insert?>г.<!-- (поверка на оборудование, подтверждение квалификации) -->
                            <?}?>
                    </div>
                </div>
            </div>
        </div> 

        <?

        foreach ($attachmentfiles as $file) {
            echo '<img class="mt-5" style="max-width: 700px" src="'.$file.'">';
        }
        foreach ($userfiles as $file) {
            echo '<img class="mt-5" style="max-width: 700px" src="'.$file.'">';
        }
        ?>
            
       
  </div>
 
</body>
</html>