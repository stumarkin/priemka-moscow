/**
 * @author Sergey Tumarkin https://tumarkin.me
 */

import logo from './logo.png';
import './App.css';
import { Button } from 'react-bootstrap';
import Forms from './components/Forms';
import Users from './components/Users';

import { useState, useEffect, useCallback } from 'react';

import * as API from './data/API';



function App() {
  const [isUpdatesourceLoading, setIsUpdatesourceLoading] = useState(false);

  const doAlert = (e) => {
    setIsUpdatesourceLoading(true);
    e.preventDefault();
    API.Get({ method:'updatesource'})
        .then(res => {
          console.log(res.data)
            if (res.data.result ){
                alert('Структура обновлена')
              } else {
                alert('Что-то пошло не так')
                console.log( 'updatesource load fail. API response:\n' + JSON.stringify(res.data) ) 
            }
        })
        .finally(()=>{
          setIsUpdatesourceLoading(false);
        })
    
  }

  return (
    <div className='col-lg-8 mx-auto p-4 py-md-5'>
      <header class="d-flex align-items-center pb-3 mb-5 border-bottom">
        <a href="/" class="d-flex align-items-center text-body-emphasis text-decoration-none">
          <span class="fs-4">Приемка.Москва &middot; Панель управления</span>
        </a>
      </header>
      <main>
        <h1 class="text-body-emphasis mb-4">Последние приемки</h1>
        <Forms/>
        <hr class="col-3 col-md-2 mb-5" />

        <h1 class="text-body-emphasis mb-4">Пользователи</h1>
        <Users/>
        <hr class="col-3 col-md-2 mb-5" />

        <h1 class="text-body-emphasis mb-4">Структура приемки</h1>
        <p class="fs-5 col-md-8">Для изменения структуры и содержания приёмки, скорректируйте <a target='blank' href="https://docs.google.com/spreadsheets/d/1A9WBf3rhws8rpHpAPEH7bH1buPILrEU4Rpb49nNRPHI/edit#gid=1623387219">гугл таблицу</a> и после этого нажмите кнопку 👇 и дождитесь подтверждения обновления.</p>

        <div class="mb-5">
          <a href="#" class="btn btn-primary btn-lg px-4" onClick={doAlert}>{
             !isUpdatesourceLoading ? 'Обновить структуру' : (
              <div class="spinner-grow text-light" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
              )
            }</a>
        </div>

        <hr class="col-3 col-md-2 mb-5" />


      </main>
    </div>

  );
}

export default App;
