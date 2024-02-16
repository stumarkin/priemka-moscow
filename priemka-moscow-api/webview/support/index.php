<!doctype html>
<html lang="en">
  	<head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossorigin="anonymous">

      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
      <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
      <script src="https://unpkg.com/axios/dist/axios.min.js"></script>
      <script src="https://code.jquery.com/jquery-3.2.1.slim.min.js" integrity="sha384-KJ3o2DKtIkvYIK3UENzmM7KCkRr/rE9/Qpg6aAZGJwFDMVNA/GpGFF93hXpG5KkN" crossorigin="anonymous"></script>
      <script src="https://cdn.jsdelivr.net/npm/popper.js@1.12.9/dist/umd/popper.min.js" integrity="sha384-ApNbgh9B+Y1QKtv3Rn7W3mgPxhU9K/ScQsAP7hUibX39j7fakFPskvXusvfa0b4Q" crossorigin="anonymous"></script>
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.0.0/dist/js/bootstrap.min.js" integrity="sha384-JZR6Spejh4U02d8jOt6vLEHfe/JQGiRRSQQxSfFWpi1MquVdAyjUar5+76PVCmYl" crossorigin="anonymous"></script>
	</head>
	<body>
		<div class="container" id="app">
          <div class="row">
              <div class="col" style="background-color: #e6edfb; background-image: url('https://priemka-pro.ru/webview/assets/support.png'); background-size: cover; height: 150px">
            </div>
          </div>
          <div class="row">
            <div class="col px-3 pt-4 pb-2">
              <div class="h2 px-1 mb-4" style="font-weight: 700;">Популярные вопросы</div>
              
              <div id="accordion">
                
                <div v-for=" (q, i) in faq" class="px-4 py-2 my-2 rounded-3" style="background-color: #FFEFD5;">
                  <h6 class="my-2" data-toggle="collapse" :data-target="'#collapse'+i" aria-expanded="true" :aria-controls="'#collapse'+i">
                      {{ q.q }}
                  </h6>
                  <div :id="'collapse'+i" class="collapse" v-html="q.a"></div>
                </div>
  
              </div>
            </div>
          </div>

          <div class="row" id="app">
              <div class="col px-3">

                <div v-if="!isPayed" class="p-4 rounded-3" style=" background-image: url('https://priemka-pro.ru/webview/pro/img/pro_landing_form.png'); background-position: right top; background-repeat: no-repeat; background-color:  #e6edfb;">
                  <div class="h4 mb-2 text-dark">Запрос в службу поддержки</div>
                  <p>
                    Оказываем поддержку через Telegram. Опишите подробно ваш вопрос или проблему с приложением.
                  <p>
                     В некоторых случаях может потребоваться ID вашего приложения, скопируйте и перешлите сотруднику поддержки.
                  </p>
                  <div class="mt-4">
                      <label for="deviceid" class="small ">ID вашего приложения:</label>
                      <div class="input-group w-100 mt-2">
                        <input type="text" class="form-control" id="deviceid" v-model="deviceid">
                        <div class="input-group-prepend">
                          <div v-if="!deviceidWasCopied" class="input-group-text" @click="copy">Копировать</div>
                          <div v-else class="bg-success text-light input-group-text" @click="copy">Скопировано</div>
                        </div>
                      </div>
                  </div>
                  
                  <div>
                      <a href="https://t.me/priemka_pro" target="_blank" class="btn btn-primary btn-lg w-100 mt-4" >
                          Написать в Telegram
                      </a>
                  </div>
                </div>

              </div>
          </div>
          <div class="row">
            <div class="col p-4">
              <? 
              // print_r($_GET)
              ?>
                <div class="h2 mt-2" style="font-weight: 700;">Связь с разработчиком</div>
                <p>С предложениями сотрудничества обращайтесь в <a href="https://t.me/stumarkin" target="_blank" >@stumarkin</a></p>
               
            </div>

        </div>
        <script>
            const { createApp } = Vue
            
            const app = createApp({
                data() {
                    return {
                      faq: [
                        {
                          q: 'В моей квартире несколько комнат и санузлов. Как их добавить в приёмку?',
                          a: `<p>После нажатия кнопки <i>Начать приемку</i>, в вашу приёмку автоматически добавляется набор помещений (комнат), которые встречаются в большинстве квартир. Они добавляются по умолчанию и их можно изменить.</p>
                              <p>Чтобы удалить помещение, зайдите в раздел этой комнаты, на верхней панели нажмите иконку &middot;&middot;&middot; и нажмите <i>Удалить комнату</i>.</p>
                              <p>Чтобы добавить помещение, нажмите синюю кнопку <i>Добавить комнату</i>.</p>`
                        },
                        {
                          q: 'Как изменить наборы проверок в комнате?',
                          a: `<p>Набор проверок - это несколько пунктов проверок определенного типа строительных/отделочных работ в помещении. Например, проверка укладки плитки или установки потолка.</p>
                              <p>В каждое помещение (комнату) автоматически добавляются наборы проверок, которые применимы в большинстве случаев. Они добавляются по умолчанию и их можно изменить.</p>
                              <p>Чтобы удалить проверки, нажмите иконку &middot;&middot;&middot; у заголовка проверок и нажмите <i>Удалить провеки</i>. При этом удаляются и выделенные недостатки в этих проверках.</p>
                              <p>Чтобы добавить проверки, нажмите синюю кнопку <i>Добавить проверки</i> на экране конкретной комнаты.</p>`
                        },
                        {
                          q: 'Как дополнить отчет приёмки своими замечаниями?',
                          a: 'На экране проверки помещения под списком наборов проверок есть текстовое поле, в которое можно добавить дополнительные замечания в свободной форме. Добавленные замечения добавляются в итоговый список недостатков и в акт осмотра.'
                        },
                        {
                          q: 'Как получить список выявленных недостатков?',
                          a: 'На экране приемки под списком помещений расположены кнопки получения списка недостатков и акта осмотра. Далее и то и другое вы можете отправить (поделиться) через любой мессенджер.'
                        },
                        {
                          q: 'Пока я пробовал приложение, у меня закончились беслпатные приёмки. Что делать?',
                          a: 'Ограничение бесплатного использования – пять приёмок. Этого обычно достаточно для тестировани и последующего реального некоммерческого применения (для себя). Если вам не хватило лимита, вы можете перейти на Pro-тариф или скачать приложение на другой телефон и воспользоваться бесплатнымы возможностями заново.'
                        },
                        {
                          q: 'Как перенести оплаченный Pro на другое устройство?',
                          a: 'Обратитель в чат поддержки с этим запросом, указав ID устройства и адрес одной из приёмок с предыдущего устройства.'
                        },
                      ],
                      deviceid: '<?=$_GET['deviceid']?>' || 'hey',
                      deviceidWasCopied: false,


                      plans: [
                        {id: '30d990r', name: '30 дней за 990₽', price: '990', days: '30'},
                        {id: '90d2390r', name: '90 дней за 2 390₽ (скидка 20%)', price: '2490', days: '90'},
                        {id: '180d4190r', name: '180 дней за 4 190₽ (скидка 30%)', price: '4 490', days: '180'},
                      ],
                      planChoosen: 1,
                      username: '',
                      userphone: '',
                      isSendingForm: false,
                      isPayed: false,
                      status: ''
                    }
                },
                watch: {

                },
                methods: {

                    copy(){
                      console.log('copy');
                      const element = document.querySelector('#deviceid');
                      const storage = document.createElement('textarea');
                      storage.value = element.value;
                      storage.style.top = "0";
                      storage.style.left = "0";
                      storage.style.position = "fixed";
                      document.body.appendChild(storage);
                      storage.focus();
                      storage.select();

                      try {
                        var successful = document.execCommand('copy');
                        this.deviceidWasCopied = successful;
                        console.log('Fallback: Copying text command was ' + msg);
                      } catch (err) {
                        console.error('Fallback: Oops, unable to copy', err);
                      }

                      document.body.removeChild(storage);
                    },
                    sendForm(){
                        if (this.userphone.length == 0){
                            this.status = "Укажите ваши контактные данные";
                            return false
                        } else {
                            this.status = "";

                            this.isSendingForm = true;
                            const data = {
                                deviceid: '<?=$_GET['deviceid']?>',
                                userphone: this.userphone,
                                id: this.plans[this.planChoosen].id,
                                name: this.plans[this.planChoosen].name,
                                price: this.plans[this.planChoosen].price,
                                days: this.plans[this.planChoosen].days,
                            }  
                            
                            // Bot
                            axios.post( 
                                '/api/v2/index.php?method=activateplan', 
                                data, 
                                { headers: { 'Content-Type': 'multipart/form-data'} }
                            )
                            .then( (res)=>{
                                console.log(res.data);
                                if (res.data.result==true){
                                  this.isPayed = true;
                                  window.location.hash = '#callback'
                                }
                            })
                            .catch( err => {
                                this.status = err;
                            })
    
                            //GS
                            axios.post( 
                                'https://script.google.com/macros/s/AKfycbwUSvEicTVYm_IskUw9vZp9W8jaChulIgKgpz571jZ8ekAdR2i2zE2C8huEmdpQ2Gfm3A/exec', 
                                data, 
                                { headers: { 'Content-Type': 'multipart/form-data'} }
                            )

                            this.isSendingForm = false;
                        }

                    }
                }
            }).mount('#app')
        </script>
	</body>
</html>