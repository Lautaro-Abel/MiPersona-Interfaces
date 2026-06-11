// ===============================
// Verificación de sesión
// ===============================

let currentUser = null;

async function validateSession() {

    try {

        const response = await fetch('/userData', {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            window.location.href = 'index.html';
            return;
        }

        const data = await response.json();

        currentUser = data.result[0];
        updateUserInterface();

        console.log('Usuario autenticado:', currentUser);

    } catch (error) {

        console.error(error);

        window.location.href = 'index.html';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await validateSession();
    setupUserDataCard();
    setupLogout();
    setupTurnsCard();
    setupCertificatesCard();
    setupLicencesCard();
    setupDeleteAccount();
    setupEditProfile();
    setupSecurity();
    setupGenerateTurn();

});

function updateUserInterface() {

    const title = document.getElementById('welcomeTitle');
    const description = document.getElementById('welcomeDescription');

    if (!title || !description || !currentUser) return;

    title.textContent =
        `Bienvenido ${currentUser.name} ${currentUser.lastName}`;

    description.textContent =
        `CUIL: ${currentUser.cuil} | Email: ${currentUser.email}`;
}

function setupLogout() {

    const logoutBtn = document.getElementById('logoutBtn');

    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', async (e) => {

        e.preventDefault();

        try {

            const response = await fetch('/logout', {
                method: 'POST',
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || 'No se pudo cerrar sesión.');
                return;
            }

            window.location.href = 'index.html';

        } catch (error) {

            console.error(error);

            alert('Error al conectar con el servidor.');
        }
    });
}

function showPanel(title, html) {

    const panel = document.getElementById('resultPanel');
    const panelTitle = document.getElementById('resultTitle');
    const panelContent = document.getElementById('resultContent');

    panelTitle.textContent = title;
    panelContent.innerHTML = html;

    panel.classList.remove('hidden');

    panel.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

function setupUserDataCard() {

    const btn = document.getElementById('showUserData');

    if (!btn) return;

    btn.addEventListener('click', async (e) => {

        e.preventDefault();

        try {

            const response = await fetch('/userData', {
                    method: 'GET',
                    credentials: 'include'
                });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message);
            }

            const user = data.result[0];

            showPanel("Mis Datos", `
                <div class="user-card">

                    <div class="user-card-header">
                        <i class="fa-solid fa-user"></i>
                        <h3>${user.name} ${user.lastName}</h3>
                    </div>

                    <div class="user-info-grid">

                        <div class="info-item">
                            <span class="info-label">DNI</span>
                            <span class="info-value">${user.dni}</span>
                        </div>

                        <div class="info-item">
                            <span class="info-label">CUIL</span>
                            <span class="info-value">${user.cuil}</span>
                        </div>

                        <div class="info-item">
                            <span class="info-label">Email</span>
                            <span class="info-value">${user.email}</span>
                        </div>

                        <div class="info-item">
                            <span class="info-label">Teléfono</span>
                            <span class="info-value">${user.numberPhone || "-"}</span>
                        </div>

                        <div class="info-item">
                            <span class="info-label">Fecha de Nacimiento</span>
                            <span class="info-value">${user.birthDate}</span>
                        </div>

                    </div>

                </div>
            `);

        } catch (error) {

            showPanel(
                "Error",
                `<p>${error.message}</p>`
            );

        }

    });

}

async function setupTurnsCard() {

    const btn = document.getElementById('showTurns');

    if (!btn) return;

    btn.addEventListener('click', async (e) => {

        e.preventDefault();

        try {

            const response = await fetch('/showTurn', {
                method: 'GET',
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok) {
                showPanel('Mis Turnos', `<div class="result-item">${data.message || 'Error al obtener los turnos.'}</div>`);
                return;
            }

            const turns = data.result;

            let html = '';

            turns.forEach(turn => {

                html += `
    <div class="resource-card">
        <h4>${turn.turnName}</h4>

        <div class="resource-type">
            ${turn.turnType}
        </div>

        <p>
            ${turn.description}
        </p>
    </div>
`;
            });

            showPanel('Mis Turnos', html);

        } catch (error) {

            console.error(error);

            showPanel(
                'Mis Turnos',
                '<div class="result-item">Error al obtener los turnos.</div>'
            );
        }
    });
}

async function setupCertificatesCard() {

    const btn = document.getElementById('showCertificates');

    if (!btn) return;

    btn.addEventListener('click', async (e) => {

        e.preventDefault();

        try {

            const response = await fetch('/showCertificate', {
                method: 'GET',
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok) {
                showPanel('Mis Certificados', `<div class="result-item">${data.message || 'Error al obtener los certificados.'}</div>`);
                return;
            }

            const certificates = data.result;

            let html = '';

            certificates.forEach(certificate => {

                html += `
        <div class="resource-card">

            <h4>${certificate.certificateName}</h4>

            <div class="resource-type">
                ${certificate.certificateType}
            </div>

        </div>
    `;
            });

            showPanel('Mis Certificados', html);

        } catch (error) {

            console.error(error);

            showPanel(
                'Mis Certificados',
                '<div class="result-item">Error al obtener los certificados.</div>'
            );
        }
    });
}

async function setupLicencesCard() {

    const btn = document.getElementById('showLicences');

    if (!btn) return;

    btn.addEventListener('click', async (e) => {

        e.preventDefault();

        try {

            const response = await fetch('/showLicence', {
                method: 'GET',
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok) {
                showPanel('Mis Licencias', `<div class="result-item">${data.message || 'Error al obtener las licencias.'}</div>`);
                return;
            }

            const licences = data.result;

            let html = '';

            licences.forEach(licence => {

                html += `
        <div class="resource-card">

            <h4>${licence.licenceName}</h4>

            <div class="resource-type">
                ${licence.licenceType}
            </div>

        </div>
    `;
            });

            showPanel('Mis Licencias', html);

        } catch (error) {

            console.error(error);

            showPanel(
                'Mis Licencias',
                '<div class="result-item">Error al obtener las licencias.</div>'
            );
        }
    });
}

function setupDeleteAccount() {

    const btn = document.getElementById('deleteAccountBtn');

    if (!btn) return;

    btn.addEventListener('click', async (e) => {

        e.preventDefault();

        const confirmed = confirm(
            '¿Está seguro que desea eliminar su cuenta?\n\nEsta acción no se puede deshacer.'
        );

        if (!confirmed) return;

        try {

            const response = await fetch('/deleteAccount', {
                method: 'DELETE',
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || 'No se pudo eliminar la cuenta.');
                return;
            }

            alert('Cuenta eliminada correctamente.');

            window.location.href = 'index.html';

        } catch (error) {

            console.error(error);

            alert('Error al conectar con el servidor.');
        }
    });
}

function setupEditProfile() {

    const btn = document.getElementById('editProfileBtn');

    if (!btn) return;

    btn.addEventListener('click', (e) => {

        e.preventDefault();

        showPanel("Actualizar Datos Personales", `
    <div class="form-card">

        <form>

            <div class="form-group">
                <label>Nuevo Teléfono</label>
                <input
                    type="text"
                    id="newPhone"
                    value="${currentUser.numberPhone || ''}">
            </div>

            <button
                type="button"
                id="saveProfileBtn"
                class="btn-primary">

                Actualizar Datos

            </button>

            <div
                id="profileMessage"
                style="margin-top:15px;">
            </div>

        </form>

    </div>
`);

        setupSaveProfile();
    });
}

async function setupSaveProfile() {

    const btn = document.getElementById('saveProfileBtn');

    if (!btn) return;

    btn.addEventListener('click', async () => {

        const newPhone =
            document.getElementById('newPhone').value.trim();

        const messages = [];

        try {

            if (newPhone !== currentUser.numberPhone) {

                const response = await fetch('/updateNumberPhone', {
                    method: 'PUT',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        newNumberPhone: newPhone
                    })
                });

                const data = await response.json();

                messages.push(data.message);

                if (response.ok) {
                    currentUser.numberPhone = newPhone;
                }
            }

            document.getElementById('profileMessage').innerHTML =
                messages.join('<br>');

            updateUserInterface();

        } catch (error) {

            console.error(error);

            document.getElementById('profileMessage').textContent =
                'Error al actualizar los datos.';
        }
    });
}

function setupSecurity() {

    const btn = document.getElementById('securityBtn');

    if (!btn) return;

    btn.addEventListener('click', (e) => {

        e.preventDefault();

        showPanel("Seguridad", `

<div class="form-card">

    <h3>Actualizar Email</h3>

    <div class="form-group">
        <label>Nuevo Email</label>
        <input
            type="email"
            id="newEmail">
    </div>

    <div class="form-group">
        <label>Contraseña Actual</label>
        <input
            type="password"
            id="emailPassword">
    </div>

    <button
        type="button"
        id="updateEmailBtn"
        class="btn-primary">


        Actualizar Email

    </button>

    <hr style="margin:25px 0">

    <h3>Actualizar Contraseña</h3>

    <div class="form-group">
        <label>Contraseña Actual</label>
        <input
            type="password"
            id="currentPassword">
    </div>

    <div class="form-group">
        <label>Nueva Contraseña</label>
        <input
            type="password"
            id="newPassword">
    </div>

    <div class="form-group">
        <label>Confirmar Contraseña</label>
        <input
            type="password"
            id="confirmPassword">
    </div>

    <button
        type="button"
        id="updatePasswordBtn"
        class="btn-primary">

        Actualizar Contraseña

    </button>

    <div
        id="securityMessage"
        style="margin-top:15px;">
    </div>

</div>
`);

        setupUpdateEmail();
        setupUpdatePassword();
    });
}

async function setupUpdateEmail() {

    const btn = document.getElementById('updateEmailBtn');

    if (!btn) return;

    btn.addEventListener('click', async () => {

        const newEmail =
            document.getElementById('newEmail').value.trim();

        const verifyPassword =
            document.getElementById('emailPassword').value;

        try {

            const response = await fetch('/updateEmail', {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    newEmail,
                    verifyPassword
                })
            });

            const data = await response.json();

            document.getElementById('securityMessage').textContent =
                data.message;

            if (response.ok) {

                currentUser.email = newEmail;

                updateUserInterface();
            }

        } catch (error) {

            console.error(error);

            document.getElementById('securityMessage').textContent =
                'Error al actualizar el email.';
        }
    });
}

async function setupUpdatePassword() {

    const btn = document.getElementById('updatePasswordBtn');

    if (!btn) return;

    btn.addEventListener('click', async () => {

        const password =
            document.getElementById('currentPassword').value;

        const newPassword =
            document.getElementById('newPassword').value;

        const checkPassword =
            document.getElementById('confirmPassword').value;

        try {

            const response = await fetch('/updatePassword', {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    password,
                    newPassword,
                    checkPassword
                })
            });

            const data = await response.json();

            document.getElementById('securityMessage').textContent =
                data.message;

            if (response.ok) {

                document.getElementById('currentPassword').value = '';
                document.getElementById('newPassword').value = '';
                document.getElementById('confirmPassword').value = '';
            }

        } catch (error) {

            console.error(error);

            document.getElementById('securityMessage').textContent =
                'Error al actualizar la contraseña.';
        }
    });
}

async function setupGenerateTurn() {

    const btn = document.getElementById('generateTurnBtn');

    if (!btn) return;

    btn.addEventListener('click', async (e) => {

        e.preventDefault();

        try {

            const response = await fetch('/availableTurns', {
                method: 'GET',
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok) {

                showPanel(
                    'Solicitar Turno',
                    `<div class="result-item">${data.message}</div>`
                );

                return;
            }

            const turns = data.result;

            let html = '';

            turns.forEach((turn, index) => {

                html += `
<div class="turn-card">

    <h4>${turn.turnName}</h4>

    <div class="turn-type">
        ${turn.turnType}
    </div>

    <div class="turn-description">
        ${turn.description}
    </div>

    <button
        class="btn-primary request-turn-btn"
        data-name="${turn.turnName}"
        data-type="${turn.turnType}">
        Solicitar Turno
    </button>

</div>
`;
            });

            showPanel('Turnos Disponibles', html);

            setupTurnRequestButtons();

        } catch (error) {

            console.error(error);

            showPanel(
                'Turnos Disponibles',
                '<div class="result-item">Error al obtener los turnos.</div>'
            );
        }
    });
}

function setupTurnRequestButtons() {

    const buttons = document.querySelectorAll('.request-turn-btn');

    buttons.forEach(button => {

        button.addEventListener('click', async () => {

            const turnName = button.dataset.name;
            const turnType = button.dataset.type;

            try {

                const response = await fetch('/generateTurn', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        turnName,
                        turnType
                    })
                });

                const data = await response.json();

                alert(data.message);

                if (response.ok) {

                    button.disabled = true;
                    button.textContent = 'Solicitado';
                }

            } catch (error) {

                console.error(error);

                alert('Error al solicitar el turno.');
            }
        });

    });
}

function clearPanel() {

    const panel = document.getElementById('resultPanel');
    const title = document.getElementById('resultTitle');
    const content = document.getElementById('resultContent');

    if (!panel) return;

    title.textContent = '';
    content.innerHTML = '';

    panel.classList.add('hidden');
}