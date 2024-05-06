<!doctype html>
<html lang="en">
  	<head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossorigin="anonymous">

      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
      <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
      <script src="https://code.jquery.com/jquery-3.2.1.slim.min.js" integrity="sha384-KJ3o2DKtIkvYIK3UENzmM7KCkRr/rE9/Qpg6aAZGJwFDMVNA/GpGFF93hXpG5KkN" crossorigin="anonymous"></script>
      <script src="https://cdn.jsdelivr.net/npm/popper.js@1.12.9/dist/umd/popper.min.js" integrity="sha384-ApNbgh9B+Y1QKtv3Rn7W3mgPxhU9K/ScQsAP7hUibX39j7fakFPskvXusvfa0b4Q" crossorigin="anonymous"></script>
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.0.0/dist/js/bootstrap.min.js" integrity="sha384-JZR6Spejh4U02d8jOt6vLEHfe/JQGiRRSQQxSfFWpi1MquVdAyjUar5+76PVCmYl" crossorigin="anonymous"></script>
	</head>
	<body>
		<div class="container" id="app">
          <div class="row">
              <div class="col" style="height: 150px; background-color: #6272da; background-image: url('https://priemka-pro.ru/webview/assets/switch.png'); background-size: contain; background-repeat: no-repeat; background-position-x: right">
            </div>
          </div>
          <div class="row">
            <div class="col p-4">
              <? 
              // print_r($_GET)
              ?>
                <div class="h2 mt-2" style="font-weight: 700;">Как пользоваться?</div>
                <ol>
                  <li>Чтобы начать приёмку, нажмите синюю кнопку на главном экране</li>
                  <li>На следующем экране вы увидете список наиболее частых помещений (комнат), из которых состоит любая квартира. Удаляйте ненужные и добавляйте те, что есть именно в вашей квартире</li>
                  <li>В каждой комнате выбирайте необходимые группы проверок. Опять же, самые частые проверки уже добавлены по умолчанию, их можно удалять и добавлять другие.</li>
                  <li>Просто следуйте по списку проверок и отмечайте те из них, где выявлены недостатки</li>
                </ol>
              </div>
          </div>

          <div class="row">
            <div class="col px-4">
              <div class="h2" style="font-weight: 700;">Как выглядит результат?</div>
              <p>Все отмеченные недостатки попадут в итоговый список. Есть два способа передать его менеджеру застройщика:</p>
              <ul>
                <li>в&nbsp;виде <u>Акта осмотра</u>, на бумаге или в электронном виде</li>
                <li>в виде Заключения, если заказана <u>дополнительная</u> услуга - заключение специалиста</li>
              </ul>
              <p>Оба эти способа доступны в приложении. Просто выберете нужную кнопку на экране приёмки квартиры.</p>
            </div>
          </div>

     

        </div>
        <script>
            const { createApp } = Vue
            
            const app = createApp({
                data() {
                    return {
                      faq: [

                        {
                          q: 'Кто требует отчет?',
                          a: 'Отчет требуется только банку, причем для большинства банков отчет формируется оценщиком непосредственно в системе банка, и физически Вам даже не придется его никуда передавать. Вам нужно только заказать и оплатить услугу оценки. Большинство банков работают с электронными отчетами, бумажная версия отчета - большая редкость. В МФЦ бумажный отчет об оценке также больше не требуется.'
                        },
                        {
                          q: 'Какие банки принимают оценку?',
                          a: 'Любой банк на 100% примет наш оценочный отчет. Некоторые банки ("специалисты" в отделениях) могут пытаться настаивать на привлечении определенных оценочных компаний, и даже угрожать непринятием отчета. Обычно такие компании аффилированны с самим банком, платят в банк комиссию, и в этом причина подобных требований.'
                        },
                        {
                          q: 'Какой срок подготовки оценки?',
                          a: 'Срок выполнения услуги - 1-3 рабочих дня с момента предоставления всех документов и фотографирования квартиры.'
                        },
 
                      ],
                    }
                },
                watch: {
                },
                methods: {
                }
            }).mount('#app')
        </script>
	</body>
</html>