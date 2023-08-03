let contactTemplate = Handlebars.compile($('#contactTemplate').html());
let contactsTemplate = Handlebars.compile($('#contactsTemplate').html());
let formTemplate = Handlebars.compile($('#formTemplate').html());
Handlebars.registerPartial('contactTemplate', $('#contactTemplate').html());

// Fetch contacts to determine initial homepage render
fetchHomepage();

document.addEventListener("DOMContentLoaded", e => {
  document.getElementById("contacts").addEventListener("click", async e => {
    e.preventDefault();

    // Edit button handling
    if (e.target.classList.contains("edit-button")) {
      let contactId = e.target.parentNode.id;
      let contactObj = await fetchContact(contactId);
      contactObj.action = "Edit";
      contactObj.contactId = contactId;
      if (contactObj.tags) {
        let checkedTags = parseTags(contactObj);
        checkedTags.forEach(item => contactObj[item] = "checked");
      }

      clearNoContactsMsg();
      resetHiddenContactDivs();
      toggleHiddenDivs();
      clearSearchBar();
      let main = document.querySelector("main");
      main.insertAdjacentHTML("afterbegin", formTemplate(contactObj));
      bindFormButtons();      
    }

    // Delete button handling
    if (e.target.classList.contains("delete-button")) {
      if (window.confirm('Are you sure you want to delete the contact?')) {
        await deleteContact(e.target.parentNode.id);
        fetchHomepage();
      } 
    }
  });

  // Search bar input handling
  document.getElementById("search-bar").addEventListener("input", e => {
    let text = e.currentTarget.value.toLowerCase();
    let contacts = document.querySelectorAll(".contact");
    let noContactsElement = document.getElementById("no-contacts");
    
    let matchExists = false;
    contacts.forEach(contactDiv => {
      let name = contactDiv.firstElementChild.textContent.toLowerCase();
      if (text === name.slice(0, text.length) || text === '') {
        matchExists = true;
        clearNoContactsMsg();
        contactDiv.classList.remove("hidden")
      } else {
        contactDiv.classList.add("hidden");
      }
    });

    if (!matchExists && !noContactsElement) {
      let html = `<h1 id="no-contacts">There are no contacts starting with ${text}.</h1>`;
      document.getElementById("contacts").insertAdjacentHTML("afterend", html);
    } else if (!matchExists) {
      noContactsElement.textContent = `There are no contacts starting with ${text}.`;
    }
  });
});

async function fetchHomepage() {
  await fetch("/api/contacts")
  .then(response => response.json())
  .then(json => {
    let contactsDiv = document.getElementById("contacts");
    let contacts = json.length > 0 ? json : null;
    contactsDiv.innerHTML = contactsTemplate({contacts});
    bindAddButtons();
  });
}

async function fetchContact(id) {
  let contact;
  await fetch(`/api/contacts/${id}`)
  .then(response => {
    return response.json();
  })
  .then(json => {
    contact = json
  });
  return contact;
}

async function deleteContact(id) {
  await fetch(`/api/contacts/${id}`, {method: "delete"}).catch(err => console.log("Delete failed."));
}

function parseTags(contactObj) {
  let booleans = ["work", "friend", "family", "other"];
  let tags = contactObj.tags.split(",");
  booleans = booleans.filter(boolean => tags.includes(boolean));
  return booleans.map(boolean => boolean + "Checked");
}

function formatTags(tagsArray) {
  let tags = '';
  tagsArray.forEach(tag => {
    if (tag.checked) {
      tags += `${tag.id},`
    }
  });
  if (tags.length) tags = tags.slice(0, -1);
  return tags;
}

function bindAddButtons() {
  let addButtons = document.querySelectorAll(".add-contact");
  addButtons.forEach(button => {
    button.removeEventListener("click", addButtonListener);
    button.addEventListener("click", addButtonListener);
  });
}

function addButtonListener(e) {
  resetHiddenContactDivs();
  clearNoContactsMsg();
  toggleHiddenDivs();
  clearSearchBar();
  let main = document.querySelector("main");
  main.insertAdjacentHTML("afterbegin", formTemplate({action: "Add"}));
  bindFormButtons();
}

function bindFormButtons() {
  let submit = document.getElementById("submit");
  let cancel = document.getElementById("cancel");

  cancel.addEventListener("click", e => {
    e.preventDefault();
    document.getElementById("contact-form").remove();
    toggleHiddenDivs();
  });

  submit.addEventListener("click", async e => {
    e.preventDefault();
    clearErrorMessages();
    
    let success = true;
    if (document.getElementById("name").value.length === 0) {
      validateInput('name');
      success = false;
    }
    if (document.getElementById("phone").value.length === 0) {
      validateInput('phone');
      success = false;
    }
    if (!validEmail(document.getElementById("email").value)) {
      validateInput('email');
      success = false;
    }
    
    if (success) {
      submitContact();
      document.getElementById("contact-form").remove();
      await fetchHomepage();
      toggleHiddenDivs();
    }
  });
}

function toggleHiddenDivs() {
  document.querySelectorAll(".toggleable").forEach(div => div.classList.toggle("hidden"));
}

async function submitContact() { 
  let tagsInfo = [];
  let tags = document.querySelectorAll("input[type='checkbox']");
  tags.forEach(element => {
    tagsInfo.push({
      id: element.id, 
      checked: element.checked
    });
  });

  let data = {
    full_name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    phone_number: document.getElementById("phone").value.trim(),
    tags: formatTags(tagsInfo)
  };

  let contactId = document.getElementById("contact-form").getAttribute("data-contactId");
  if (contactId) { // Edit existing contact
    await fetch(`/api/contacts/${contactId}`, {
      method: 'put',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    }).catch(err => console.log("Put request unsuccessful"));
  } else { // Add new contact
    await fetch('/api/contacts', {
      method: 'post',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    }).catch(err => console.log("Post request unsuccessful"));
  }
}

function clearNoContactsMsg() {
  let h1 = document.getElementById("no-contacts");
  if (h1) h1.remove();
}

function resetHiddenContactDivs() {
  let contactDivs = document.querySelectorAll(".contact");
  contactDivs.forEach(div => div.classList.remove("hidden"));
}

function clearSearchBar() {
  document.getElementById("search-bar").value = '';
}

function validEmail(string) {
  return /[a-z0-9]+@[a-z]+\.[a-z]+/i.test(string);
}

function validateInput(elementId) {
  let element = document.getElementById(elementId);
  let msg;

  if (elementId === 'name' || elementId === 'phone') {
    msg = "Field cannot be left empty.";
  } else {
    msg = "Please enter a valid email.";
  }
  element.insertAdjacentHTML("afterend", `<p class="input-error">${msg}</p>`);
}

function clearErrorMessages() {
  let errorMessages = document.querySelectorAll(".input-error");
  errorMessages.forEach(element => element.remove());
}
