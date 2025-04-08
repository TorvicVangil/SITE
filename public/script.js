window.onload = () => {
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  if (!usuario) {
    window.location.href = 'login.html';
    return;
  }

  document.getElementById('nome').textContent = usuario.nome;
  document.getElementById('salario').innerHTML = '💰 ' + usuario.salario;
  document.getElementById('salario_card').textContent = usuario.salario;
};

function sair() {
  localStorage.removeItem('usuario');
  window.location.href = 'login.html';
}
