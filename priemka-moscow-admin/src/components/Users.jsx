/**
 * @author Sergey Tumarkin https://tumarkin.me
 */

import Table from 'react-bootstrap/Table';
import * as API from '../data/API';
import { useState, useEffect, useCallback } from 'react';




export default function Forms(props) {
    const [users, setUsers] = useState([]);
    
    useEffect(() => {
        API.Get({ method:'getusers'})
        .then(res => {
            console.log(res.data)
            if (res.data.result ){
                setUsers( res.data.users );
            } else {
                console.log( 'getusers load fail. API response:\n' + JSON.stringify(res.data) ) 
            }
        })

    }, [])


    return (
        <Table striped bordered hover>
        <thead>
          <tr>
            <th>#</th>
            <th>Логин</th>
            <th>Права админа</th>
            <th>Дата создания</th>
            <th>Последний вход</th>
            <th>Комментарий</th>
            <th>Device Id</th>
          </tr>
        </thead>
        <tbody>
            {
                users.map( ({id,username,is_admin,date_insert,last_login,comment,deviceid}) => (
                    <tr>
                       
                        <td>{id}</td>
                        <td>{username}</td>
                        <td>{is_admin}</td>
                        <td>{date_insert}</td>
                        <td>{last_login}</td>
                        <td>{comment}</td>
                        <td>{deviceid}</td>
                    </tr>
                ) )
            }
        </tbody>
      </Table>
    )
}