import {createSlice} from '@reduxjs/toolkit';

const initialState = {
    userInfo: localStorage.getItem('userInfo') ? JSON.parse(localStorage.getItem('userInfo')) : null,
    isAuthenticated: localStorage.getItem('userInfo') ? true : false,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials(state, action) {
            state.userInfo = action.payload;
            state.isAuthenticated = true;
            localStorage.setItem('userInfo', JSON.stringify(action.payload));
            
        },
        clearCredentials(state) {
            state.userInfo = null;
            state.isAuthenticated = false;
            localStorage.removeItem('userInfo');
            
        },
    },
});

export const {setCredentials, clearCredentials} = authSlice.actions;

export default authSlice.reducer;
