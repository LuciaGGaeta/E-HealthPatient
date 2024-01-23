// Import from "@inrupt/solid-client-authn-browser"
import {
  login,
  handleIncomingRedirect,
  getDefaultSession,
  fetch
} from "@inrupt/solid-client-authn-browser";

// Import from "@inrupt/solid-client"
import {
  addUrl,
  addStringNoLocale,
  createSolidDataset,
  createThing,
  getPodUrlAll,
  getSolidDataset,
  getThingAll,
  getStringNoLocale,
  saveSolidDatasetAt,
  setThing,
  getContentType,
  getFile,
  getSourceUrl,
  isRawData ,
  getUrlAll,
  saveFileInContainer,
  universalAccess
} from "@inrupt/solid-client";

import { SCHEMA_INRUPT, RDF, AS } from "@inrupt/vocab-common-rdf";

const MY_NAMESPACE = "http://example.org/my#";
const MY_SCHEMA = {
  name: `${MY_NAMESPACE}name`,
  date: `${MY_NAMESPACE}date`,
  firstName: `${MY_NAMESPACE}firstName`,
  lastName: `${MY_NAMESPACE}lastName`,
};

const selectorIdP = document.querySelector("#select-idp");
const selectorPod = document.querySelector("#select-pod");
const buttonLogin = document.querySelector("#btnLogin");
const buttonUpload = document.querySelector("#btnUpload");
const buttonRead = document.querySelector("#btnRead");
const buttonView = document.querySelector("#btnView");


buttonRead.setAttribute("disabled", "disabled");
buttonLogin.setAttribute("disabled", "disabled");
buttonUpload.setAttribute("disabled", "disabled");
buttonView.setAttribute("disabled", "disabled")

function loginToSelectedIdP() {
  const SELECTED_IDP = document.getElementById("select-idp").value;

  return login({
    oidcIssuer: SELECTED_IDP,
    redirectUrl: new URL("/", window.location.href).toString(),
    clientName: "HEALTHCARE"
  });
}

async function handleRedirectAfterLogin() {
  console.log("Handling redirect after login...");
  await handleIncomingRedirect();

  const session = getDefaultSession();
  if (session.info.isLoggedIn) {
    document.getElementById("myWebID").value = session.info.webId;
    buttonRead.removeAttribute("disabled");
  }
}

handleRedirectAfterLogin();

async function getMyPods() {
 
}

document.getElementById('btnUpload').onclick = async function () {
  const SELECTED_POD = document.getElementById('select-pod').value;
  const webIDDoctor = document.getElementById("webIdDoctorInput").value;
  const pathInPod = `${SELECTED_POD}healthcare/heart/`;

  await createFolderIfNotExists(SELECTED_POD, "healthcare", { fetch });
  await createFolderIfNotExists( `${SELECTED_POD}healthcare/`, "heart/", { fetch });

  const fileInput = document.getElementById('fileInput');
  const firstNameInput = document.getElementById('firstNameInput').value;
  const lastNameInput = document.getElementById('lastNameInput').value;
  const emailDoctorInput = document.getElementById('emailDoctorInput').value;
  const dateInput = document.getElementById('dateInput').value;

  const file = fileInput.files[0];

  if (file) {
    const nameFile = `${file.name}`;

    const savedFile = await saveFileInContainer(
      pathInPod,
      file,
      { slug: nameFile, contentType: "text/plain", fetch: fetch }
    );

    if (savedFile) {

     
      console.log('File caricato con successo nel Pod');

      let myReadingList;
      try {
        myReadingList = await getSolidDataset(`${SELECTED_POD}healthcare/heart/myList`, { fetch });
      } catch (error) {
        if (typeof error.statusCode === "number" && error.statusCode === 404) {
          myReadingList = createSolidDataset();
        } else {
          console.error(error.message);
        }
      }

      myReadingList = createAndAddFileToReadingList(
        nameFile,
        `${pathInPod}${nameFile}`,
        myReadingList,
        firstNameInput,
        lastNameInput,
        dateInput
      );
      
      await saveSolidDatasetAt(
        `${SELECTED_POD}healthcare/heart/myList`,
        myReadingList,
        { fetch: fetch }
      );
      const completeUrl = `${SELECTED_POD}healthcare/heart/${nameFile}`;
      if (webIDDoctor) {
           universalAccess.setAgentAccess(
            completeUrl,
           webIDDoctor,
          { read: true, write: true },
          { fetch: fetch }
        ).then((fileAccess) => {
          logAccessInfo(webIDDoctor, fileAccess, completeUrl);
        }).catch((error) => {
          console.error("Errore durante la modifica dei permessi per il file:", error);
        });


        universalAccess.setAgentAccess(
          `${SELECTED_POD}healthcare/heart/myList`,         
          webIDDoctor,     
          { read: true, write: true },          
          { fetch: fetch }
        ).then((newAccess) => {
          logAccessInfo(webIDDoctor, newAccess,`${SELECTED_POD}healthcare/heart/myList`)
        }).catch((error) => {
          console.error("Errore durante la modifica dei permessi:", error);
        });
    
        const stringaConPercorso = SELECTED_POD.replace('https://storage.inrupt.com/', '');
        const stringaDaInviare = stringaConPercorso.replace('/healthcare/heart/', '');
        const stringaDaInviare1 = stringaConPercorso.replace('/', '');
        console.log("stringadainviare"+stringaDaInviare1);
        const msg = {
          personalizations: [
            {
              to: [
                {
                  email: emailDoctorInput,
                },
              ],
            },
          ],
          from: {
            email: 'dottorheart886@gmail.com',
            name:  'Dottorheart',
     
          },
          subject: 'File Caricato con Successo',
          content: [
            {
              type: 'text/plain',
              value: 'Il documente del paziente ' + firstNameInput + ' ' + lastNameInput  +  ' è stato caricato con successo nel Pod. Per accedere alla lista del paziente ' + stringaDaInviare1 + " . Grazie.",
            },
            
          ],
        };
      
        try {
          // Chiamata all'API del server
          const response = await fetch('http://localhost:3000/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(msg),
          });
      
          // Gestisci la risposta
          if (response.ok) {
            console.log('API chiamata con successo');
          } else {
            console.error('Errore durante la chiamata all\'API:', response.statusText);
          }
        } catch (error) {
          console.error('Errore durante la chiamata all\'API:', error);
        }
      }
      
      alert('File caricato con successo nel Pod e aggiunto alla lista di lettura');
    } else {
      console.error('Errore durante il caricamento del file nel Pod');
      alert('Errore durante il caricamento del file nel Pod');
    }
  } else {
    console.error('Nessun file selezionato.');
    alert('Nessun file selezionato.');
  }
};

async function createFolderIfNotExists(parentFolderUrl, folderName, options) {
  const folderUrl = `${parentFolderUrl}${folderName}/`;
  try {
    await getSolidDataset(folderUrl, options);
  } catch (error) {
    if (typeof error.statusCode === "number" && error.statusCode === 404) {
      const folder = createSolidDataset();
      await saveSolidDatasetAt(folderUrl, folder, options);
    } else {
      console.error(`Errore durante la verifica/creazione della cartella ${folderUrl}:`, error);
    }
  }
}


document.getElementById('btnView').onclick = async function () {
  const SELECTED_POD = document.getElementById('select-pod').value;
  document.getElementById('view').style.display = 'block';

  try {
    const myReadingList = await getSolidDataset(`${SELECTED_POD}healthcare/heart/myList`, { fetch });

    const fileNodes = getThingAll(myReadingList);

    const predicatesToExtract = [
      MY_SCHEMA.name,
      MY_SCHEMA.firstName,
      MY_SCHEMA.lastName,
      MY_SCHEMA.date
    ];

    const listContainer = document.getElementById('listContainer');
    listContainer.innerHTML = '';

    fileNodes.forEach((fileNode, index) => {
      const extractedData = {};
      predicatesToExtract.forEach((predicate) => {
        const value = getStringNoLocale(fileNode, predicate);
        const propertyName = predicate.split(/[#/]/).pop();
        const displayedPropertyName = propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
        extractedData[displayedPropertyName] = value;
      });
    
      const card = document.createElement('div');
      card.classList.add('col', 's12', 'm6','l3');
      card.style.marginLeft = '20px';
      card.style.marginTop = '20px';
      card.innerHTML = `
        <div class="row"> 
        <div class="col s12" >
          <div class="card blue lighten-5"> 
            <div class="card-content black-text">
              <span class="card-title" >${extractedData.Name}</span>
              <p>${extractedData.FirstName} ${extractedData.LastName}</p>
              <p>${extractedData.Date}</p>
            </div>
            <div class="card-action">
              <button class="btn btn-primary btn-sm" style="background-color: #007BFF;" data-url="${getUrlAll(fileNode, SCHEMA_INRUPT.url)[0]}">Download</button>
            </div>
          </div>
        </div>
      </div>`;

    
      listContainer.appendChild(card);
    });

    // Add click event for download buttons
    listContainer.querySelectorAll('.btn-primary').forEach((button) => {
      button.addEventListener('click', () => {
        const fileURL = button.getAttribute('data-url');
        const fileName = fileURL.split('/').pop();
        readFileFromPod(fileURL, fileName);
      });
    });
  } catch (error) {
    console.error('Error retrieving reading list:', error);
  }
};


function createAndAddFileToReadingList(name, url, readingList, firstNameInput, lastNameInput, date) {
  const safeName = name.replace(/ /g, "_");

  let item = createThing({ name: safeName });

  item = addUrl(item, RDF.type, AS.Article);
  item = addUrl(item, SCHEMA_INRUPT.url, url);

  item = addStringNoLocale(item, MY_SCHEMA.name, name);
  item = addStringNoLocale(item, MY_SCHEMA.date, date);
  item = addStringNoLocale(item, MY_SCHEMA.firstName, firstNameInput);
  item = addStringNoLocale(item, MY_SCHEMA.lastName, lastNameInput);



  return setThing(readingList, item);
}

buttonLogin.onclick = function () {
  loginToSelectedIdP();
};

buttonRead.onclick = function () {
  getMyPods();
};

selectorIdP.addEventListener("change", idpSelectionHandler);
function idpSelectionHandler() {
  if (selectorIdP.value === "") {
    buttonLogin.setAttribute("disabled", "disabled");
  } else {
    buttonLogin.removeAttribute("disabled");
  }
}

async function readFileFromPod(fileURL, name) {
  try {
    const file = await getFile(
      fileURL,
      { fetch: fetch }
    );

    const contentType = getContentType(file);
    console.log(`Fetched a ${contentType} file from ${getSourceUrl(file)}.`);
    if (isRawData(file)) {
      console.log("Il file è binario.");
      const arrayBuffer = await file.arrayBuffer();

      const blob = new Blob([new Uint8Array(arrayBuffer)], { type: contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      console.log("Il file non è binario e potrebbe essere un dataset RDF.");
    }
  } catch (err) {
    console.error("Errore durante la lettura del file dal Pod:", err);
  }
}

function logAccessInfo(agent, agentAccess, resource) {
  console.log(`For resource::: ${resource}`);
  if (agentAccess === null) {
    console.log(`Could not load ${agent}'s access details.`);
  } else {
    console.log(`${agent}'s Access:: ${JSON.stringify(agentAccess)}`);
  }
}


document.addEventListener('DOMContentLoaded', function() {
  var modals = document.querySelectorAll('.modal');
  M.Modal.init(modals);
});

document.addEventListener('DOMContentLoaded', function() {
  const toggleSection = document.getElementById('toggleSection');
  const sectionToToggle = document.getElementById('sectionToToggle');
  const toggleIcon = document.getElementById('toggleIcon');

  toggleSection.addEventListener('click', function() {
    // Cambia la visibilità della sezione
    if (sectionToToggle.style.display === 'none' || sectionToToggle.style.display === '') {
      sectionToToggle.style.display = 'block';
      toggleIcon.textContent = 'arrow_drop_up'; // Cambia l'icona a freccia su quando la sezione è visibile
    } else {
      sectionToToggle.style.display = 'none';
      toggleIcon.textContent = 'arrow_drop_down'; // Cambia l'icona a freccia giù quando la sezione è nascosta
    }
  });
});















