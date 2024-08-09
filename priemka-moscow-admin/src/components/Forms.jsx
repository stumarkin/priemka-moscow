/**
 * @author Sergey Tumarkin https://tumarkin.me
 */

import Table from 'react-bootstrap/Table';
import * as API from '../data/API';
import { useState, useEffect, useCallback } from 'react';




export default function Forms(props) {
    const [forms, setForms] = useState([]);
    
    useEffect(() => {
        API.Get({ method:'getforms'})
        .then(res => {
            if (res.data.result === true ){
                setForms( res.data.forms );
            } else {
                console.log( 'getforms load fail. API response:\n' + JSON.stringify(res.data) ) 
            }
        })
    }, [])


    return (
        <Table striped bordered hover>
        <thead>
          <tr>
            <th>#</th>
            <th>Адрес</th>
            <th>Заказчик</th>
            <th>Недостатки/Преверки</th>
            <th>Дата создания</th>
          </tr>
        </thead>
        <tbody>
            {
                forms.map( ({id, address, checksCountTotal, failChecksCountTotal, timestamp, apartmentNum, customer}) => (
                    <tr>
                        <td><a href={"http://pm.priemka-pro.ru/r/"+id}>{id}</a></td>
                        <td>{address}{apartmentNum ? ", "+apartmentNum : ""}</td>
                        <td>{customer}</td>
                        <td>{failChecksCountTotal} / {checksCountTotal}</td>
                        <td>{timestamp.replace('T', ' ')}</td>
                    </tr>
                ) )
            }
        </tbody>
      </Table>
    )
}