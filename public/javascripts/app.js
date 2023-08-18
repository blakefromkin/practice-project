class Model {
  constructor() {
    this.contacts = [];
  }

  async refreshContacts() {
    try {
      let response = await fetch("/api/contacts");
      this.contacts = await response.json();
    } catch(err) {
      throw(err);
    }
  }

  async editContact(data, id) {
    try {
      await fetch(`/api/contacts/${id}`, {
        method: 'put',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
      });
      await this.refreshContacts();
    } catch(err) {
      throw err;
    }
  }

  async addContact(data) {
    try {
      await fetch('/api/contacts', {
        method: 'post',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
      });
      await this.refreshContacts();
    } catch(err) {
      throw err;
    }
  }

  async deleteContact(id) {
    try {
      await fetch(`/api/contacts/${id}`, {method: "delete"});
      await this.refreshContacts();
    } catch(err) {
      throw err;
    }
  }

  getContactById(id) {
    return this.contacts.filter(contact => id === contact.id)[0];
  }

  additionalTags() {
    let defaultTags = ["work", "friend", "family", "other"];
    let trackDupes= [];
    let addtlTags = [];
    
    this.contacts.forEach(contact => {
      if (!contact.tags) return;
      let tags = contact.tags.split(",");
        tags.forEach(tag => {
          if (!defaultTags.includes(tag) && !trackDupes.includes(tag)) {
            trackDupes.push(tag);
            addtlTags.push({tag});
          }
      });
    });
    return addtlTags.length > 0 ? addtlTags : null;
  }

  tagExists(tagString) {
    return !!this.contacts.find(contact => contact.tags.split(",").includes(tagString));
  }
}

class View {
  constructor() {
    this.main = document.querySelector("main");
    this.actionBarDiv = document.getElementById("action-bar");
    this.contactsDiv = document.getElementById("contacts");
    this.tagSelectElement = document.getElementById("tag-select");
    this.searchBar = document.getElementById("search-bar");
    this.addButtons = document.querySelectorAll(".add-contact");

    this.contactTemplate = Handlebars.compile($('#contactTemplate').html());
    this.contactsTemplate = Handlebars.compile($('#contactsTemplate').html());
    this.formTemplate = Handlebars.compile($('#formTemplate').html());
    this.tagTemplate = Handlebars.compile($('#tagSelectTemplate').html());
    Handlebars.registerPartial('contactTemplate', $('#contactTemplate').html());
  }

  renderContacts(contacts) {
    this.contactsDiv.innerHTML = this.contactsTemplate({contacts});
  }

  renderEditForm(templateObj) {
    this.clearNoContactsMsg();
    this.resetHiddenContactDivs();
    this.toggleHiddenDivs();
    this.clearSearchBar();
    this.resetTagsFilter();
    this.main.insertAdjacentHTML("afterbegin", this.formTemplate(templateObj));
  }

  renderAddForm(additionalTags) {
    this.resetHiddenContactDivs();
    this.clearNoContactsMsg();
    this.toggleHiddenDivs();
    this.clearSearchBar();
    this.resetTagsFilter();

    let templateObj = {
      action: "Add",
      additionalTags
    }
    this.main.insertAdjacentHTML("afterbegin", this.formTemplate(templateObj));
  }

  toggleHiddenDivs() {
    document.querySelectorAll(".toggleable").forEach(div => div.classList.toggle("hidden"));
  }

  populateTagsFilter(tagsArray) {
    this.tagSelectElement.innerHTML = '<option value="all">all</option>';
    this.tagSelectElement.insertAdjacentHTML("beforeend", this.tagTemplate({tags: tagsArray}));
  }

  resetTagsFilter() {
    this.tagSelectElement.value = 'all';
  }

  clearNoContactsMsg() {
    let h1 = document.getElementById("no-contacts");
    if (h1) h1.remove();
  }

  renderNoContactsMsg(text, alreadyExists) {
    if (alreadyExists) {
      this.getNoContactsElement().textContent = `There are no contacts starting with ${text}.`;
    } else {
      let html = `<h1 id="no-contacts">There are no contacts starting with ${text}.</h1>`;
      this.contactsDiv.insertAdjacentHTML("afterend", html);
    }
  }

  getNoContactsElement() {
    return document.getElementById("no-contacts");
  }

  resetHiddenContactDivs() {
    let contactDivs = document.querySelectorAll(".contact");
    contactDivs.forEach(div => div.classList.remove("hidden"));
  }

  clearSearchBar() {
    this.searchBar.value = '';
  }

  getSearchText() {
    return this.searchBar.value.toLowerCase();
  }

  getContactDiv(id) {
    return document.getElementById(`${id}`);
  }

  getTagElements() {
    return document.querySelectorAll("input[type='checkbox']");
  }

  getCurrentContactId() {
    return document.getElementById("contact-form").getAttribute("data-contactId");
  }

  getFormElement() {
    return document.querySelector("form");
  }

  removeFormElement() {
    this.getFormElement().remove();
  }

  getContactDiv(id) {
    return document.getElementById(`${id}`);
  }

  getNewTag() {
    return document.getElementById("new-tag").value.toLowerCase();
  }

  renderErrorMessage(elementId) {
    let element = document.getElementById(elementId);
    let msg;
  
    if (elementId === 'name' || elementId === 'phone') {
      msg = "Field cannot be left empty.";
    } else if (elementId === 'email') {
      msg = "Please enter a valid email.";
    } else msg = "Enter a valid tag. No spaces or duplicate tags."
    element.insertAdjacentHTML("afterend", `<p class="input-error">${msg}</p>`);
  }

  clearErrorMessages() {
    let errorMessages = document.querySelectorAll(".input-error");
    errorMessages.forEach(element => element.remove());
  }

  hide(element) {
    element.classList.add("hidden");
  }

  unhide(element) {
    element.classList.remove("hidden");
  }
}

class Controller {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    
    this.view.renderContacts(this.model.contacts);
    this.bindContactClickLogic();
    this.refreshTagsFilter();
    this.bindSearchBarHandler();
    this.bindTagFilterHandler();
    this.bindAddButtons();
  }

  editHandler(e) {
    let contactId = +e.target.parentNode.id;
    let contactObj = this.model.getContactById(contactId);
    contactObj.action = "Edit";
    contactObj.contactId = contactId;
    contactObj.additionalTags = this.model.additionalTags();

    this.view.renderEditForm(contactObj);
    this.bindFormButtons();
  }

  addHandler(e) {
    let tags = this.model.additionalTags();
    this.view.renderAddForm(tags);
    this.bindFormButtons();
  }

  bindAddButtons() {
    this.view.addButtons.forEach(button => {
      button.addEventListener("click", this.addHandler.bind(this));
    });
  }

  async deleteHandler(e) {
    if (window.confirm('Are you sure you want to delete the contact?')) {
      await this.model.deleteContact(e.target.parentNode.id);
      this.view.renderContacts(this.model.contacts);
    } 
  }

  bindSearchBarHandler() {
    this.view.searchBar.addEventListener("input", e => {
      this.view.resetTagsFilter();
      let text = this.view.getSearchText();
      let noContactsElement = this.view.getNoContactsElement();

      let matchExists = false;
      this.model.contacts.forEach(contact => {
        let name = contact.full_name.toLowerCase();
        let div = this.view.getContactDiv(contact.id);

        if (text === name.slice(0, text.length) || text === '') {
          matchExists = true;
          this.view.clearNoContactsMsg();
          this.view.unhide(div);
        } else {
          this.view.hide(div);
        }
      });

      if (!matchExists && !noContactsElement) { 
        this.view.renderNoContactsMsg(text, false);
      } else if (!matchExists) {
        this.view.renderNoContactsMsg(text, true);
      }

      if (!text) this.view.resetTagsFilter();
    });
  }

  bindNewTagHandler() {
    document.getElementById("tag-button").addEventListener("click", e => {
      e.preventDefault();
      this.view.clearErrorMessages();
  
      let text = this.view.getNewTag();
      if (text.length === 0 || text.includes(' ') || this.model.tagExists(text)) {
        this.view.renderErrorMessage('tag-button');
      } else {
        let html = `<input type="checkbox" id="${text}" name="${text}" checked/>` +
                    `<label class="tag" for="${text}">${text}</label>`;
        let tags = this.view.getTagElements();
        let lastTag = tags[tags.length - 1];
        lastTag.insertAdjacentHTML("beforebegin", html);
      }
    });
  }

  async bindContactClickLogic() {
    this.view.contactsDiv.addEventListener("click", async e => {
      e.preventDefault();

      if (e.target.classList.contains("edit-button")) {
        this.editHandler(e);
      }

      if (e.target.classList.contains("delete-button")) {
        await this.deleteHandler(e);
      }
    });
  }

  refreshTagsFilter() {
    let addtlTags = this.model.additionalTags();
    let tags = ["work", "friend", "family", "other"];
    if (addtlTags) tags = tags.concat(addtlTags.map(tag => tag.tag));
    tags = tags.map(tag => {
      return {tag};
    });
    
    this.view.populateTagsFilter(tags);
  }

  validEmail(string) {
    return /[a-z0-9]+@[a-z]+\.[a-z]+/i.test(string);
  }

  formatTags(tagsArray) {
    let tags = '';
    tagsArray.forEach(tag => {
      if (tag.checked) {
        tags += `${tag.id},`
      }
    });
    if (tags.length) tags = tags.slice(0, -1);
    return tags;
  }

  cancelHandler(e) {
    e.preventDefault();
    this.refreshTagsFilter();
    this.view.clearSearchBar();
    this.view.getFormElement().remove();
    this.view.toggleHiddenDivs();
  }

  async submitHandler(e) {
    e.preventDefault();
    this.view.clearErrorMessages();

    let form = this.view.getFormElement();
    let success = true;
    if (form.name.value.length === 0) {
      this.view.renderErrorMessage('name');
      success = false;
    }
    if (form.phone.value.length === 0) {
      this.view.renderErrorMessage('phone');
      success = false;
    }
    if (!this.validEmail(form.email.value)) {
      this.view.renderErrorMessage('email');
      success = false;
    }

    if (success) {
      await this.submitContact();
      this.refreshTagsFilter();
      this.view.clearSearchBar();
      this.view.renderContacts(this.model.contacts);
      this.view.removeFormElement();
      this.view.toggleHiddenDivs();
    }
  }

  bindFormButtons() {
    document.getElementById("cancel").addEventListener("click", this.cancelHandler.bind(this));
    document.getElementById("submit").addEventListener("click", this.submitHandler.bind(this));
    this.bindNewTagHandler();
  }

  async submitContact() {
    let tagsInfo = [];
    let tags = this.view.getTagElements();
    tags.forEach(element => {
      tagsInfo.push({
        id: element.id, 
        checked: element.checked
      });
    });

    let form = this.view.getFormElement();
    let data = {
      full_name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone_number: form.phone.value.trim(),
      tags: this.formatTags(tagsInfo)
    };

    let contactId = this.view.getCurrentContactId();
    if (contactId) {
      await this.model.editContact(data, contactId);
    } else {
      await this.model.addContact(data);
    }
  }

  bindTagFilterHandler() {
    this.view.tagSelectElement.addEventListener("input", e => {
      this.view.clearSearchBar();
      let val = e.currentTarget.value;
      if (val === 'all') {
        this.view.clearNoContactsMsg();
        this.view.resetHiddenContactDivs();
        return;
      }

      let contacts = this.model.contacts;
      let noContactsElement = this.view.getNoContactsElement();

      let matchExists = false;
      contacts.forEach(contact => {
        let div = this.view.getContactDiv(`${contact.id}`);
        let tags = contact.tags.split(",");

        if (!contact.tags || !tags.includes(val)) {
          this.view.hide(div);
        } else {
          matchExists = true;
          this.view.unhide(div);
        }
      });
      if (matchExists) this.view.clearNoContactsMsg();
        if (!matchExists && !noContactsElement) {
          let html = `<h1 id="no-contacts">There are no matching contacts.</h1>`;
          this.view.contactsDiv.insertAdjacentHTML("afterend", html);
        }
    });
  } 
}

document.addEventListener("DOMContentLoaded", async () => {
  let model = new Model();
  await model.refreshContacts();
  let view = new View();
  
  new Controller(model, view);
});
