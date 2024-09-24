const appId = "-fafvhitsjq-uc.a.run.app";

document.addEventListener("DOMContentLoaded", () => {
  if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
    alert(
      "Ваш браузер не поддерживает File API. Пожалуйста, обновите браузер."
    );
    return;
  }

  const form = document.getElementById("fopForm");
  form.addEventListener("submit", handleSubmit);

  const accountNumberInput = document.getElementById("accountNumber");
  accountNumberInput.addEventListener("blur", formatAccountNumber);

  const fopInput = document.getElementById("fop");
  fopInput.addEventListener("blur", formatFopName);

  const contractDateInput = document.getElementById("contractDate");
  contractDateInput.addEventListener("change", updateContractEndDate);

  const contractNumberInput = document.getElementById("contractNumber");
  loadLastContractNumber().then((lastNumber) => {
    contractNumberInput.value = lastNumber;
  });
  contractNumberInput.addEventListener("blur", handleContractNumberChange);

  initPopup();
  populateFopSelect();
});

function initPopup() {
  const addFopBtn = document.getElementById("addFopBtn");
  const popupContainer = document.getElementById("popupContainer");
  const saveNewFopBtn = document.getElementById("saveNewFop");

  addFopBtn.addEventListener("click", () => {
    popupContainer.classList.add("show-popup");
  });

  const closePopupBtn = document.getElementById("closePopup");
  closePopupBtn.addEventListener("click", () => {
    popupContainer.classList.remove("show-popup");
  });

  saveNewFopBtn.addEventListener("click", () => {
    const newFopInput = document.getElementById("newFopName").value;
    const newTemplate = document.getElementById("newTemplate");
    const file = newTemplate.files[0];

    if (!file) {
      alert("Пожалуйста, выберите файл шаблона.");
      return;
    }

    addDocToDb(newFopInput, file);
  });
}

async function addDocToDb(fop, file) {
  const templateArrayBuffer = await file.arrayBuffer();

  const dbName = "TemplatesDB";
  const storeName = "templates";
  const version = 1;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, version);

    request.onerror = (event) =>
      reject("IndexedDB error: " + event.target.error);

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);

      const addRequest = store.put({ fop: fop, template: templateArrayBuffer });

      addRequest.onerror = () => reject("Error adding template to IndexedDB");
      addRequest.onsuccess = () => resolve("Template added successfully");

      transaction.oncomplete = () => db.close();
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      db.createObjectStore(storeName, { keyPath: "fop" });
    };
  });
}

function getDocFromDb(fop) {
  const dbName = "TemplatesDB";
  const storeName = "templates";
  const version = 1;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, version);

    request.onerror = (event) =>
      reject("IndexedDB error: " + event.target.error);

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);

      const getRequest = store.get(fop);

      getRequest.onerror = () =>
        reject("Error retrieving template from IndexedDB");
      getRequest.onsuccess = () => {
        if (getRequest.result) {
          resolve(getRequest.result.template);
        } else {
          reject("Template not found");
        }
      };

      transaction.oncomplete = () => db.close();
    };
  });
}

function populateFopSelect() {
  const dbName = "TemplatesDB";
  const storeName = "templates";
  const version = 1;

  const request = indexedDB.open(dbName, version);

  request.onerror = (event) => {
    console.error("IndexedDB error:", event.target.error);
    alert("Ошибка при доступе к базе данных. Пожалуйста, попробуйте снова.");
  };

  request.onsuccess = (event) => {
    const db = event.target.result;
    const transaction = db.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);

    const getAllRequest = store.getAll();

    getAllRequest.onerror = () => {
      console.error("Error retrieving FOPs from IndexedDB");
      alert("Ошибка при получении списка ФОП. Пожалуйста, попробуйте снова.");
    };

    getAllRequest.onsuccess = () => {
      const fops = getAllRequest.result;
      const selectElement = document.getElementById("ourFop");

      // Clear existing options
      selectElement.innerHTML = "";

      // Add default option
      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = "Выберите ФОП";
      selectElement.appendChild(defaultOption);

      // Add FOPs to select
      fops.forEach((fop, index) => {
        const option = document.createElement("option");
        option.value = fop.fop;
        option.textContent = fop.fop;
        if (index === 0) {
          option.selected = true;
        }
        selectElement.appendChild(option);
      });
    };

    transaction.oncomplete = () => db.close();
  };
}

function handleSubmit(event) {
  event.preventDefault();
  generate();
}

function saveContractNumber(value) {
  fetch(`https://updatecontractnumber${appId}?number=${value}`).then(
    (response) => console.log(response.status)
  );
  localStorage.setItem("lastContractNumber", value);
}

async function loadLastContractNumber() {
  try {
    const localLastNum = localStorage.getItem("lastContractNumber") || "";
    const response = await fetch(`https://getcontractnumber${appId}`);
    const data = await response.json();

    if (data.lastNumber) {
      localStorage.setItem("lastContractNumber", data.lastNumber);
      return data.lastNumber;
    }

    return localLastNum;
  } catch (error) {
    console.error("Error fetching last contract number:", error);
    return localStorage.getItem("lastContractNumber") || "";
  }
}

function formatAccountNumber() {
  this.value = this.value.replace(/\s/g, "");

  const feedbackElement =
    this.nextElementSibling || document.createElement("span");
  feedbackElement.className = "iban-feedback";

  if (!this.nextElementSibling) {
    this.parentNode.insertBefore(feedbackElement, this.nextSibling);
  }

  fetch(
    `https://openiban.com/validate/${this.value}?getBIC=true&validateBankCode=true`
  )
    .then((response) => response.json())
    .then((data) => {
      if (data.valid) {
        this.classList.remove("invalid-iban");
        this.classList.add("valid-iban");
        feedbackElement.textContent = "Valid IBAN";
        feedbackElement.style.color = "green";
      } else {
        this.classList.remove("valid-iban");
        this.classList.add("invalid-iban");
        feedbackElement.textContent = "Invalid IBAN";
        feedbackElement.style.color = "red";
      }
    })
    .catch((error) => {
      console.error("Error validating IBAN:", error);
      this.classList.remove("valid-iban", "invalid-iban");
      feedbackElement.textContent = "";
    });
}

function formatFopName() {
  this.value = this.value
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function updateContractEndDate() {
  const contractDateInput = document.getElementById("contractDate");
  const contractEndDateInput = document.getElementById("contractEndDate");

  if (contractDateInput.value) {
    const startDate = new Date(contractDateInput.value);
    const endDate = new Date(
      startDate.getFullYear() + 1,
      startDate.getMonth(),
      startDate.getDate() + 1
    );
    contractEndDateInput.value = endDate.toISOString().split("T")[0];
  } else {
    contractEndDateInput.value = "";
  }
}

function generate() {
  const form = document.getElementById("fopForm");
  const fileInput = document.getElementById("fileInput");

  const formData = getFormData(form);

  if (!validateFormData(formData)) {
    return;
  }

  const file = getDocFromDb(formData.ourFop);

  console.log("Генерация с данными формы:", formData);
  patchDocxInBrowser(file, formData);
}

function getFormData(form) {
  return {
    fop: form.fop.value.trim(),
    contractNumber: form.contractNumber.value.trim(),
    contractDate: form.contractDate.value.trim(),
    contractEndDate: form.contractEndDate.value.trim(),
    inn: form.inn.value.trim(),
    registrationDate: form.registrationDate.value.trim(),
    registrationNumber: form.registrationNumber.value.trim(),
    address: form.address.value.trim(),
    accountNumber: form.accountNumber.value.trim(),
    bank: form.bank.value.trim(),
    bankAbbreviation: form.bankAbbreviation.value.trim(),
    establishmentName: form.establishmentName.value.trim(),
    establishmentAddress: form.establishmentAddress.value.trim(),
    comission: form.comission.value.trim(),
    ourFop: form.ourFop.value.trim(),
    sex: form.sex.value.trim(),
    location: getLocation(form.location.value.trim()),
  };
}

function getLocation(location) {
  if (location === "") {
    return "empty";
  } else {
    return location;
  }
}

function validateFormData(formData) {
  for (const [key, value] of Object.entries(formData)) {
    if (!value) {
      alert(`Пожалуйста, заполните поле ${key}.`);
      return false;
    }
  }

  if (!/^\d{10}$/.test(formData.inn)) {
    alert("ИНН должен содержать 10 цифр.");
    return false;
  }

  if (!/^UA\d{27}$/.test(formData.accountNumber)) {
    alert(
      "Номер счета должен быть в формате UA + 27 цифр, например: UA093071230000026009010584020"
    );
    return false;
  }

  if (
    !isValidDate(formData.contractDate) ||
    !isValidDate(formData.contractEndDate)
  ) {
    alert("Пожалуйста, проверьте правильность введенных дат.");
    return false;
  }

  return true;
}

function isValidDate(dateString) {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

async function patchDocxInBrowser(templateFile, formData) {
  try {
    const formattedContractDate = formatDateUkrainian(formData.contractDate);
    const formattedEndContractDate = formatDateUkrainian(
      formData.contractEndDate
    );
    const bankName = formatBankName(formData.bank, formData.bankAbbreviation);

    const fopLastName = formData.fop.split(" ")[0];

    const modifiedAddress = makeAddress(formData.establishmentAddress);

    const patches = createPatches(
      formData,
      formattedContractDate,
      formattedEndContractDate,
      bankName,
      fopLastName,
      modifiedAddress
    );

    const patchedDoc = await docx.patchDocument(templateFile, {
      outputType: "nodebuffer",
      keepOriginalStyles: true,
      patches: patches,
    });

    console.log("Документ успешно изменен.");

    const blob = new Blob([patchedDoc], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    downloadBlob(blob, createDocName(formData, fopLastName));
    console.log("Документ изменен и начато скачивание.");
  } catch (error) {
    console.error("Ошибка при изменении документа:", error);
    alert(
      "Произошла ошибка при изменении документа. Пожалуйста, попробуйте снова."
    );
  }
}

function makeAddress(address) {
    if (address != "") {
      return ", що знаходиться за адресою: м. Одеса, " + address;
    } else {
      return "";
    }
}

function createDocName(formData, fopLastName) {
  var location = "";
  if (formData.location != "empty") {
    location = ` (${formData.location})`;
  }
  return `${formData.contractNumber}.24 Bond_${formData.establishmentName}${location}_${fopLastName}_${formData.ourFop}.docx`;
}

function createPatches(
  formData,
  formattedContractDate,
  formattedEndContractDate,
  bankName,
  fopLastName,
  modifiedAddress
) {
  return {
    fop: createParagraphPatch(formData.fop),
    fopLastName: createParagraphPatch(fopLastName),
    contractNumber: createParagraphPatch(formData.contractNumber),
    contractDate: createParagraphPatch(formattedContractDate),
    contractEndDate: createParagraphPatch(formattedEndContractDate),
    inn: createParagraphPatch(formData.inn),
    registrationDate: createParagraphPatch(formData.registrationDate),
    registrationNumber: createParagraphPatch(formData.registrationNumber),
    address: createParagraphPatch(formData.address),
    accountNumber: createParagraphPatch(formData.accountNumber),
    bank: createParagraphPatch(bankName),
    restName: createParagraphPatch(formData.establishmentName),
    restAddress: createParagraphPatch(modifiedAddress),
    comission: createParagraphPatch(formData.comission),
    ourFop: createParagraphPatch(formData.ourFop),
    sex: createParagraphPatch(proceedSex(formData.sex)),
  };
}

function proceedSex(sex) {
  return sex === "m" ? "який" : "яка";
}

function createParagraphPatch(text) {
  return {
    type: docx.PatchType.PARAGRAPH,
    children: [new docx.TextRun(text)],
  };
}

function formatBankName(bankName, bankAbbreviation) {
  return `${bankAbbreviation} «${bankName}»`;
}

function formatDateUkrainian(dateString) {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, "0");
  const year = date.getFullYear();
  const months = [
    "січня",
    "лютого",
    "березня",
    "квітня",
    "травня",
    "червня",
    "липня",
    "серпня",
    "вересня",
    "жовтня",
    "листопада",
    "грудня",
  ];
  return `«${day}» ${months[date.getMonth()]} ${year}`;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function handleContractNumberChange(event) {
  saveContractNumber(event.target.value);
}
