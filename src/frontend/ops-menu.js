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

window.addEventListener("DOMContentLoaded", async () => {

    try {

        const response = await fetch(
            `/accountsList`,
            {
                method: "GET",
                credentials: "include"
            }
        );

        if (!response.ok) {

            window.location.href = "index.html";
            return;
        }

    } catch (error) {

        window.location.href = "index.html";
    }

});

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {

    logoutBtn.addEventListener("click", async (e) => {

        e.preventDefault();

        try {

            await fetch(`/logout`, {
                method: "POST",
                credentials: "include"
            });

        } catch (error) {
            console.error(error);
        }

        window.location.href = "index.html";
    });

}

async function setupUsersList() {

    const btn = document.getElementById("showUsers");

    if (!btn) return;

    btn.addEventListener(
        "click",
        async (e) => {

            e.preventDefault();

            try {

                const response = await fetch(
                    `/accountsList`,
                    {
                        credentials: "include"
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    alert(data.message);
                    return;
                }

                const users = data.result || [];

                let html = `
                <table class="users-table">
                    <thead>
                        <tr>
                            <th>DNI</th>
                            <th>Nombre</th>
                            <th>Apellido</th>
                            <th>Email</th>
                            <th>Rol</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

                users.forEach(user => {

                    html += `
                    <tr>
                        <td>${user.dni}</td>
                        <td>${user.name}</td>
                        <td>${user.lastName}</td>
                        <td>${user.email}</td>
                        <td>${user.role}</td>
                    </tr>
                `;
                });

                html += `
                    </tbody>
                </table>
            `;

                showPanel(
                    "Usuarios Registrados",
                    html
                );

            } catch (error) {

                alert("Error al obtener usuarios");

            }

        }
    );

}

function setupCreateCertificate() {

    const btn = document.getElementById("createCertificateBtn");

    if (!btn) return;

    btn.addEventListener("click", (e) => {

        e.preventDefault();

        showPanel(
            "Crear Certificado",
            `
            <div class="form-container">
            <form id="createCertificateForm">

                <div class="form-group">
                    <label>Nombre del Certificado</label>
                    <input
                        type="text"
                        id="certificateName"
                        required
                    >
                </div>

                <div class="form-group">
                    <label>Tipo</label>
                    <input
                        type="text"
                        id="certificateType"
                        required
                    >
                </div>

                <div class="form-group">
                    <label>Descripción</label>
                    <textarea
                        id="certificateDescription"
                        rows="4"
                        required
                    ></textarea>
                </div>

                <button
                    type="submit"
                    class="btn-primary"
                >
                    Crear Certificado
                </button>

            </form>
            </div>
            `
        );

        setupCreateCertificateSubmit();

    });

}

async function setupCreateCertificateSubmit() {

    const form = document.getElementById(
        "createCertificateForm"
    );

    if (!form) return;

    form.addEventListener("submit", async (e) => {

        e.preventDefault();

        const certificateName =
            document.getElementById(
                "certificateName"
            ).value.trim();

        const certificateType =
            document.getElementById(
                "certificateType"
            ).value.trim();

        const description =
            document.getElementById(
                "certificateDescription"
            ).value.trim();

        try {

            const response = await fetch(
                `/createCertificate`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        certificateName,
                        certificateType,
                        description
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {

                alert(
                    data.message ||
                    "Error al crear certificado"
                );

                return;
            }

            alert(data.message);

            clearPanel();

        } catch (error) {

            alert(
                "Error de conexión con el servidor"
            );
        }

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

function setupCreateLicence() {

    const btn = document.getElementById("createLicenceBtn");

    if (!btn) return;

    btn.addEventListener("click", (e) => {

        e.preventDefault();

        showPanel(
            "Crear Licencia",
            `
    <div class="form-container">

        <form id="createLicenceForm">

            <div class="form-group">
                <label>Nombre de la Licencia</label>
                <input
                    type="text"
                    id="licenceName"
                    required
                >
            </div>

            <div class="form-group">
                <label>Tipo</label>
                <input
                    type="text"
                    id="licenceType"
                    required
                >
            </div>

            <div class="form-group">
                <label>Descripción</label>
                <textarea
                    id="description"
                    required
                ></textarea>
            </div>

            <button
                type="submit"
                class="btn-primary"
            >
                Crear Licencia
            </button>

        </form>

    </div>
    `
        );

        setupCreateLicenceSubmit();
    });
}

async function setupCreateLicenceSubmit() {

    const form = document.getElementById("createLicenceForm");

    if (!form) return;

    form.addEventListener("submit", async (e) => {

        e.preventDefault();

        const licenceName =
            document.getElementById("licenceName").value.trim();

        const licenceType =
            document.getElementById("licenceType").value.trim();

        const description =
            document.getElementById("description").value.trim();

        try {

            const response = await fetch(
                `/createLicence`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        licenceName,
                        licenceType,
                        description
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                alert(data.message);
                return;
            }

            alert(data.message);

            clearPanel();

        } catch (error) {

            alert("Error de conexión con el servidor");
        }
    });
}

function setupCreateTurn() {

    const btn = document.getElementById("createTurnBtn");

    if (!btn) return;

    btn.addEventListener("click", (e) => {

        e.preventDefault();

        showPanel(
            "Crear Turno",
            `
            <div class="form-container">

            <form id="createTurnForm">

                <div class="form-group">
                    <label>Nombre del Turno</label>
                    <input
                        type="text"
                        id="turnName"
                        required
                    >
                </div>

                <div class="form-group">
                    <label>Tipo</label>
                    <input
                        type="text"
                        id="turnType"
                        required
                    >
                </div>

                <div class="form-group">
                    <label>Descripción</label>
                    <textarea
                        id="turnDescription"
                        rows="4"
                        required
                    ></textarea>
                </div>

                <button
                    type="submit"
                    class="btn-primary"
                >
                    Crear Turno
                </button>

            </form>
            
            </div>
            `

        );

        setupCreateTurnSubmit();
    });
}

async function setupCreateTurnSubmit() {

    const form = document.getElementById("createTurnForm");

    if (!form) return;

    form.addEventListener("submit", async (e) => {

        e.preventDefault();

        const turnName =
            document.getElementById("turnName").value.trim();

        const turnType =
            document.getElementById("turnType").value.trim();

        const description =
            document.getElementById("turnDescription").value.trim();

        try {

            const response = await fetch(
                `/createTurn`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        turnName,
                        turnType,
                        description
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                alert(data.message);
                return;
            }

            alert(data.message);

            clearPanel();

        } catch (error) {

            alert("Error de conexión con el servidor");
        }
    });
}

function setupAssignCertificate() {

    const btn = document.getElementById("assignCertificateBtn");

    if (!btn) return;

    btn.addEventListener("click", async (e) => {

        e.preventDefault();

        try {

            const [usersRes, certificatesRes] = await Promise.all([
                fetch(`/accountsList`, {
                    credentials: "include"
                }),
                fetch(`/availableCertificates`, {
                    credentials: "include"
                })
            ]);

            const usersData = await usersRes.json();
            const certificatesData = await certificatesRes.json();

            const users = usersData.result || [];
            const certificates = certificatesData.result || [];

            const usersOptions = users
                .filter(user => user.role === "user")
                .map(user => `
                    <option value="${user.dni}">
                        ${user.name} ${user.lastName} - DNI ${user.dni}
                    </option>
                `)
                .join("");

            const certificateOptions = certificates
                .map(cert => `
                    <option
                        value="${cert.certificateName}|${cert.certificateType}">
                        ${cert.certificateName} (${cert.certificateType})
                    </option>
                `)
                .join("");

            showPanel(
                "Asignar Certificado",
                `
                <div class="form-container">
                <form id="assignCertificateForm">

                    <div class="form-group">
                        <label>Ciudadano</label>
                        <select id="accountDni" required>
                            ${usersOptions}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Certificado</label>
                        <select id="certificateSelect" required>
                            ${certificateOptions}
                        </select>
                    </div>

                    <button
                        type="submit"
                        class="btn-primary">
                        Asignar Certificado
                    </button>

                </form>
                </div>
                `
            );

            setupAssignCertificateSubmit();

        } catch (error) {

            alert("Error al cargar información");

        }

    });

}

function setupAssignCertificateSubmit() {

    const form =
        document.getElementById("assignCertificateForm");

    if (!form) return;

    form.addEventListener("submit", async (e) => {

        e.preventDefault();

        const accountDni =
            document.getElementById("accountDni").value;

        const selected =
            document.getElementById("certificateSelect").value;

        const [
            certificateName,
            certificateType
        ] = selected.split("|");

        try {

            const response = await fetch(
                `/generateCertificate`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        accountDni,
                        certificateName,
                        certificateType
                    })
                }
            );

            const data = await response.json();

            alert(data.message);

            if (response.ok) {
                clearPanel();
            }

        } catch (error) {

            alert("Error de conexión");

        }

    });

}

function setupAssignLicence() {

    const btn = document.getElementById("assignLicenceBtn");

    if (!btn) return;

    btn.addEventListener("click", async (e) => {

        e.preventDefault();

        try {

            const [usersRes, licencesRes] = await Promise.all([
                fetch(`/accountsList`, {
                    credentials: "include"
                }),
                fetch(`/availableLicences`, {
                    credentials: "include"
                })
            ]);

            const usersData = await usersRes.json();
            const licencesData = await licencesRes.json();

            const users = usersData.result || [];
            const licences = licencesData.result || [];

            const usersOptions = users
                .filter(user => user.role === "user")
                .map(user => `
                    <option value="${user.dni}">
                        ${user.name} ${user.lastName} - DNI ${user.dni}
                    </option>
                `)
                .join("");

            const licenceOptions = licences
                .map(licence => `
                    <option
                        value="${licence.licenceName}|${licence.licenceType}">
                        ${licence.licenceName} (${licence.licenceType})
                    </option>
                `)
                .join("");

            showPanel(
                "Asignar Licencia",
                `
                <div class="form-container">
                <form id="assignLicenceForm">

                    <div class="form-group">
                        <label>Ciudadano</label>
                        <select id="accountDni" required>
                            ${usersOptions}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Licencia</label>
                        <select id="licenceSelect" required>
                            ${licenceOptions}
                        </select>
                    </div>

                    <button
                        type="submit"
                        class="btn-primary">
                        Asignar Licencia
                    </button>

                </form>
                </div>
                `
            );

            setupAssignLicenceSubmit();

        } catch (error) {

            alert("Error al cargar información");

        }

    });

}

function setupAssignLicenceSubmit() {

    const form =
        document.getElementById("assignLicenceForm");

    if (!form) return;

    form.addEventListener("submit", async (e) => {

        e.preventDefault();

        const accountDni =
            document.getElementById("accountDni").value;

        const selected =
            document.getElementById("licenceSelect").value;

        const [
            licenceName,
            licenceType
        ] = selected.split("|");

        try {

            const response = await fetch(
                `/generateLicence`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        accountDni,
                        licenceName,
                        licenceType
                    })
                }
            );

            const data = await response.json();

            alert(data.message);

            if (response.ok) {
                clearPanel();
            }

        } catch (error) {

            alert("Error de conexión");

        }

    });

}

setupUsersList();
setupCreateCertificate();
setupCreateLicence();
setupCreateTurn();
setupAssignCertificate();
setupAssignLicence();