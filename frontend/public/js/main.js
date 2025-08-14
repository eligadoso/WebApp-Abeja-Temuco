document.addEventListener('DOMContentLoaded', () => { 
    const form = document.getElementById('loginForm'); 
    const errorMessage = document.getElementById('errorMessage'); 
 
    form.addEventListener('submit', (e) => { 
        const username = form.username.value.trim(); 
        const password = form.password.value.trim(); 
 
        if (!username || !password) { 
            e.preventDefault(); 
            errorMessage.textContent = 'Debe ingresar nombre de usuario y clave'; 
            return; 
        } 
 
        errorMessage.textContent = ''; 
    }); 
}); 
