import React from 'react';
import './Login.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser , faKey} from '@fortawesome/free-solid-svg-icons'

export default function Login() {
    return (
        <div className='wrapper'>
            <form action="">
                <h1>Login</h1>
                <div className='input-box'>
                    <input type="text" placeholder='Username' required />
                    <FontAwesomeIcon className='icon' icon={faUser} />                
                </div>
                <div className='input-box'>
                    <input type="password" placeholder='Password' required />
                    <FontAwesomeIcon className='icon' icon={faKey} />
                </div>
            </form>

            <div className="remember-forget">
                <label><input type="checkbox" />Remember me</label>
                <a href="#">Forgot password?</a>
            </div>

            <button type="submit">Login</button>
            <div className="register-link">
                <p>Don't have an account? <a href="#">Register</a></p>
            </div>
        </div>
    );
}