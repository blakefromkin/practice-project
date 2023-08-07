let contactTemplate = Handlebars.compile($('#contactTemplate').html());
let contactsTemplate = Handlebars.compile($('#contactsTemplate').html());
let formTemplate = Handlebars.compile($('#formTemplate').html());
let tagTemplate = Handlebars.compile($('#tagSelectTemplate').html());
Handlebars.registerPartial('contactTemplate', $('#contactTemplate').html());

// Fetch contacts and tags before loading the DOM
fetchHomepage();
let addtlTags;
additionalTags().then(val => addtlTags = val);
populateTagsFilter();

document.addEventListener("DOMContentLoaded", e => {
  document.getElementById("contacts").addEventListener("click", async e => {
    e.preventDefault();

    // Edit button handling
    if (e.target.classList.contains("edit-button")) {
      let contactId = e.target.parentNode.id;
      let contactObj = await fetchContact(contactId);
      contactObj.action = "Edit";
      contactObj.contactId = contactId;
      contactObj.additionalTags = addtlTags;

      clearNoContactsMsg();
      resetHiddenContactDivs();
      toggleHiddenDivs();
      clearSearchBar();
      resetTagsFilter();
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

    if (!text) document.getElementById("tag-select").value = 'all';
  });

  // Tag filter handling
  document.getElementById("tag-select").addEventListener("input", e => {
    let val = e.currentTarget.value;
    if (val === 'all') {
      clearNoContactsMsg();
      resetHiddenContactDivs();
      return;
    }


    let contacts = document.querySelectorAll(".contact");
    let noContactsElement = document.getElementById("no-contacts");

    let matchExists = false;
    contacts.forEach(contactDiv => {
      let tagsElement = contactDiv.querySelector(".contact-tags");
      if (!tagsElement) {
        contactDiv.classList.add("hidden");
        return;
      }
      let tags = tagsElement.textContent.split(",");
      if (tags.includes(val)) {
        matchExists = true;
        clearNoContactsMsg();
        contactDiv.classList.remove("hidden")
      } else {
        contactDiv.classList.add("hidden");
      }
    });

    if (!matchExists && !noContactsElement) {
      let html = `<h1 id="no-contacts">There are no matching contacts.</h1>`;
      document.getElementById("contacts").insertAdjacentHTML("afterend", html);
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
  resetTagsFilter();
  let main = document.querySelector("main");
  let templateObj = {
    action: "Add",
    additionalTags: addtlTags
  }
  main.insertAdjacentHTML("afterbegin", formTemplate(templateObj));
  bindFormButtons();
}

function bindFormButtons() {
  let submit = document.getElementById("submit");
  let cancel = document.getElementById("cancel");
  let tagButton = document.getElementById("tag-button");

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
      addtlTags = await additionalTags();
      document.getElementById("contact-form").remove();
      await fetchHomepage();
      toggleHiddenDivs();
    }
  });

  tagButton.addEventListener("click", e => {
    e.preventDefault();
    clearErrorMessages();

    let text = document.getElementById("new-tag").value.toLowerCase();
    if (text.length === 0 || text.includes(' ')) {
      validateInput('tag-button');
    } else {
      let html = `<label class="tag" for="${text}">${text}</label>` +
                `<input type="checkbox" id="${text}" name="${text}" checked/>`;
      let tags = document.querySelectorAll("input[type='checkbox']");
      let lastTag = tags[tags.length - 1];
      lastTag.insertAdjacentHTML("afterend", html);
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
    }).then(_json => {
      additionalTags().then(val => addtlTags = val);
      populateTagsFilter();
    }).catch(err => console.log("Put request unsuccessful"));
  } else { // Add new contact
    await fetch('/api/contacts', {
      method: 'post',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    }).then(_json => {
      additionalTags().then(val => addtlTags = val);
      populateTagsFilter();
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
  } else if (elementId === 'email') {
    msg = "Please enter a valid email.";
  } else msg = "Enter a valid tag. No spaces."
  element.insertAdjacentHTML("afterend", `<p class="input-error">${msg}</p>`);
}

function clearErrorMessages() {
  let errorMessages = document.querySelectorAll(".input-error");
  errorMessages.forEach(element => element.remove());
}

async function additionalTags() {
  let defaultTags = ["work", "friend", "family", "other"];
  let addtlTags = [];
  await fetch("/api/contacts")
  .then(response => response.json())
  .then(json => {
    let contacts = json.length > 0 ? json : null;
    if (contacts) {
      contacts.forEach(contact => {
        if (!contact.tags) return;
        let tags = contact.tags.split(",");
        tags.forEach(tag => {
          if (!defaultTags.includes(tag) && !addtlTags.includes(tag)) {
            addtlTags.push({tag});
          }
        });
      })
    }
  });
  return addtlTags.length > 0 ? addtlTags : null;
}

async function populateTagsFilter() {
  let addtlTags = await additionalTags();
  let tags = ["work", "friend", "family", "other"];
  if (addtlTags) tags = tags.concat(addtlTags.map(tag => tag.tag));
  tags = tags.map(tag => {
    return {tag};
  });

  let tagSelectElement = document.getElementById("tag-select");
  tagSelectElement.innerHTML = '<option value="all">all</option>';
  tagSelectElement.insertAdjacentHTML("beforeend", tagTemplate({tags}));
}

function resetTagsFilter() {
  let tagSelectElement = document.getElementById("tag-select");
  tagSelectElement.value = 'all';
}
