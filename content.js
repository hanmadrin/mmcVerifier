class ChromeStorage{
    constructor(name){
        if(typeof name!=='string') throw new Error ('unknown value for autoIncrement');
        this.name = name;
    }
    async GET() {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(this.name, (result) => { resolve(result[this.name]); }); 
        }); 
    }
    async SET(db) {
        return new Promise((resolve, reject) => {
            const obj = {};
            obj[this.name]=db;
            chrome.storage.local.set(obj, function() {resolve(db)});
        });
    }
}
// on ctrl + s
const fixedData = {
    metaInformation: {
        defaultApi: {
            title: 'Default API',
            type: 'text',
            defaultValue: '',
            point: 'value',
            interactive: true,
        }
    }
};
const sleep = (ms) => {return new Promise(resolve => setTimeout(resolve, ms));}
const mondayFetch = async (query,apiVerison="2024-01") => {
    const metaInformation = new ChromeStorage('metaInformation');
    const metaInformationValues = await metaInformation.GET();
    const defaultApi = metaInformationValues.defaultApi;
    const mondayResponse = await fetch (
        "https://api.monday.com/v2",
        {
            method: 'post',
            headers:{
                'Content-Type': 'application/json',
                'Authorization' : defaultApi,
                'API-Version' : apiVerison
            },
            body: JSON.stringify({query})
        }
    );
    return await mondayResponse.json();
}
const globalData = {
    boardId: 1250230293,
}
const validItemTitlesId = {
    'Vin#':'text6',
    "Status" : "status",
    "URL": "text7",
    "Series": "text0",
    "License#": "text__1",
    "License State": "text9__1",
};
const statusToIndexes = {
    "Unverified": 5,
    "Verified": 1,
    "BAD": 4,
    "Verified W/Vin": 17,
    "Verified W/License": 158
}
const indexToStatus = {
    1: "Verified",
    4: "BAD",
    5: "Unverified",
    17: "Verified W/Vin",
    158: "Verified W/License"
}

const verifierGetItemFromMonday = async () => {
    const boardId = globalData.boardId;
    // items_by_column_values (board_id: ${boardId}, column_id: "text7", column_value: "${window.location.href}") {
    const itemQuery = `
        query{
            items_page_by_column_values (board_id: ${boardId}, columns: [{column_id: "text7", column_values: ["${window.location.href}"]}]) {
                items{
                    id,
                    column_values{
                        value,
                        text
                        column{
                            id
                            title
                        }
                    }
                }
            }
        }`;
    let itemCount = 0;

    let titleCheckData = await mondayFetch(itemQuery); 
    // if(titleCheckData.data.items_by_column_values.length!=0){
    if(titleCheckData.data.items_page_by_column_values.items.length!=0){
        itemCount = titleCheckData.data.items_page_by_column_values.items.length;
        const validItemValues = {};
        // const itemValues = titleCheckData.data.items_by_column_values[itemCount-1].column_values;
        const itemValues = titleCheckData.data.items_page_by_column_values.items[itemCount-1].column_values;
        // validItemValues.id = titleCheckData.data.items_by_column_values[itemCount-1].id;
        validItemValues.id = titleCheckData.data.items_page_by_column_values.items[itemCount-1].id;
        const validItemTitles = Object.keys(validItemTitlesId);
        for(let i=0;i<itemValues.length;i++){
            if(validItemTitles.includes(itemValues[i].column.title)){
                    validItemValues[itemValues[i].column.title] = itemValues[i].value;
            }
        }
        const keys = Object.keys(validItemValues);
        for(let i=0;i<keys.length;i++){
            if(keys[i]==="Status"){
                const status = JSON.parse(validItemValues[keys[i]]);
                let statusIndex = 5;
                if(status!==null){
                    statusIndex = status.index;
                }
                validItemValues[keys[i]] = indexToStatus[statusIndex];
            }else{
                validItemValues[keys[i]] = JSON.parse(validItemValues[keys[i]]);
            }
            console.log(`${keys[i]} : ${validItemValues[keys[i]]}`);
        }
        return validItemValues;
    }
    return null;

}
const verifierUpdateItemToMonday = async(updateData,itemId)=>{
    const boardId = globalData.boardId;
    console.log(itemId);
    console.log(updateData);
    if(updateData.updates!=null){
        const updatesJson = JSON.stringify(updateData.updates);
        const updatesQuery = `
            mutation {
                create_update (item_id: ${itemId}, body: ${updatesJson}) {
                    id
                }
            }
        `;
        console.log('updating query');
        console.log(updatesQuery);
        await mondayFetch(updatesQuery);
    }
    let updateColumnValues = {};
    const updateColumnTitles = Object.keys(updateData);
    for(let i=0;i<updateColumnTitles.length;i++){
        if(updateColumnTitles[i]!='updates'){
            updateColumnValues[validItemTitlesId[updateColumnTitles[i]]] = updateData[updateColumnTitles[i]];
        }
    }
    console.log(updateColumnValues);
    let updateColumnValuesJson = JSON.stringify(updateColumnValues);
    if(updateColumnValuesJson!='{}'){

        updateColumnValuesJson = JSON.stringify(`${updateColumnValuesJson}`)
        const updateColumnQuery = `
            mutation {
                change_multiple_column_values(item_id:${itemId}, board_id:${boardId}, column_values: ${updateColumnValuesJson}) {
                id
                }
            }
        `;
        console.log(updateColumnQuery);
        return await mondayFetch(updateColumnQuery);
    }
}

const contentSetup = async () => {
    const mondayValues = await verifierGetItemFromMonday();
    const dynamicFrom = document.createElement('div');
    dynamicFrom.id = 'dynamicForm';
    if(mondayValues!=null){
        dragElement(dynamicFrom);
        const table = document.createElement('table');
        //Status
        const statusRow = document.createElement('tr');
        const statusKeyCell = document.createElement('td');
        statusKeyCell.innerText = "Status";
        const statusValueCell = document.createElement('td');
        const statusSelect = document.createElement('select');
        //add empty option
        const emptyOption = document.createElement('option');
        emptyOption.innerText = "";
        emptyOption.value = "";
        statusSelect.appendChild(emptyOption);
        const statusOptions = Object.keys(statusToIndexes);
        for(let i=0;i<statusOptions.length;i++){
            const statusOption = document.createElement('option');
            statusOption.id = 'verifierStatus'
            statusOption.innerText = statusOptions[i];
            statusOption.value = statusOptions[i];
            if(mondayValues['Status']==statusOptions[i]){
                statusOption.selected = true;
            }
            statusSelect.appendChild(statusOption);
        }
        statusValueCell.appendChild(statusSelect);
        statusRow.appendChild(statusKeyCell);
        statusRow.appendChild(statusValueCell);
        table.appendChild(statusRow);
    
        //Series
        // const seriesRow = document.createElement('tr');
        // const seriesKeyCell = document.createElement('td');
        // seriesKeyCell.innerText = "Series";
        // const seriesValueCell = document.createElement('td');
        // const seriesInput = document.createElement('input');
        // seriesInput.id = 'verifierSeries';
        // seriesInput.value = mondayValues['Series'];
        // seriesValueCell.appendChild(seriesInput);
        // seriesRow.appendChild(seriesKeyCell);
        // seriesRow.appendChild(seriesValueCell);
        // table.appendChild(seriesRow);
        
        


    
        //Vin#
        const vinRow = document.createElement('tr');
        const vinKeyCell = document.createElement('td');
        vinKeyCell.innerText = "Vin#";
        const vinValueCell = document.createElement('td');
        const vinInput = document.createElement('input');
        vinInput.id = 'verifierVin';
        vinInput.value = mondayValues['Vin#'];
        vinValueCell.appendChild(vinInput);
        vinRow.appendChild(vinKeyCell);
        vinRow.appendChild(vinValueCell);
        table.appendChild(vinRow);


        // License#
        const licenseRow = document.createElement('tr');
        const licenseKeyCell = document.createElement('td');
        licenseKeyCell.innerText = "License#";
        const licenseValueCell = document.createElement('td');
        const licenseInput = document.createElement('input');
        licenseInput.id = 'verifierLicense';
        licenseInput.value = mondayValues['License#'];
        licenseValueCell.appendChild(licenseInput);
        licenseRow.appendChild(licenseKeyCell);
        licenseRow.appendChild(licenseValueCell);
        table.appendChild(licenseRow);


        // License State
        const licenseStateRow = document.createElement('tr');
        const licenseStateKeyCell = document.createElement('td');
        licenseStateKeyCell.innerText = "License State";
        const licenseStateValueCell = document.createElement('td');
        const licenseStateInput = document.createElement('input');
        licenseStateInput.id = 'verifierLicenseState';
        // list=states
        licenseStateInput.setAttribute('list','states');
        licenseStateInput.value = mondayValues['License State'];
        // options
        // const knownstates = {
        //     'Wisconsin': 'WI',
        //     'Illinois': 'IL',
        //     'Tennessee': 'TN',
        //     'Mississippi': 'MS',
        //     'Alabama': 'AL',
        //     'Florida': 'FL',
        //     'Georgia': 'GA',
        //     'South Carolina': 'SC',
        //     'North Carolina': 'NC',
        //     'Kentucky': 'KY',
        //     'Virginia': 'VA',
        //     'Indiana': 'IN',
        //     'Michigan': 'MI',
        //     'Ohio': 'OH',
        //     'Pennsylvania': 'PA',
        //     'New York': 'NY',
        //     'Maine': 'ME',
        //     'New Hampshire': 'NH',
        //     'Vermont': 'VT',
        //     'Massachusetts': 'MA',
        //     'Rhode Island': 'RI',
        //     'Connecticut': 'CT',
        //     'New Jersey': 'NJ',
        //     'Delaware': 'DE',
        //     'Maryland': 'MD',
        //     'West Virginia': 'WV'
        // }
        const states = {
            "Alabama": "AL",
            "Alaska": "AK",
            "Arizona": "AZ",
            "Arkansas": "AR",
            "California": "CA",
            "Colorado": "CO",
            "Connecticut": "CT",
            "Delaware": "DE",
            "Florida": "FL",
            "Georgia": "GA",
            "Hawaii": "HI",
            "Idaho": "ID",
            "Illinois": "IL",
            "Indiana": "IN",
            "Iowa": "IA",
            "Kansas": "KS",
            "Kentucky": "KY",
            "Louisiana": "LA",
            "Maine": "ME",
            "Maryland": "MD",
            "Massachusetts": "MA",
            "Michigan": "MI",
            "Minnesota": "MN",
            "Mississippi": "MS",
            "Missouri": "MO",
            "Montana": "MT",
            "Nebraska": "NE",
            "Nevada": "NV",
            "New Hampshire": "NH",
            "New Jersey": "NJ",
            "New Mexico": "NM",
            "New York": "NY",
            "North Carolina": "NC",
            "North Dakota": "ND",
            "Ohio": "OH",
            "Oklahoma": "OK",
            "Oregon": "OR",
            "Pennsylvania": "PA",
            "Rhode Island": "RI",
            "South Carolina": "SC",
            "South Dakota": "SD",
            "Tennessee": "TN",
            "Texas": "TX",
            "Utah": "UT",
            "Vermont": "VT",
            "Virginia": "VA",
            "Washington": "WA",
            "West Virginia": "WV",
            "Wisconsin": "WI",
            "Wyoming": "WY"
        }
        // data lists
        const statesDataList = document.createElement('datalist');
        statesDataList.id = 'states';
        const statesKeys = Object.keys(states);
        for(let i=0;i<statesKeys.length;i++){
            const stateOption = document.createElement('option');
            stateOption.value = statesKeys[i];
            statesDataList.appendChild(stateOption);
        }
        document.body.appendChild(statesDataList);

        licenseStateValueCell.appendChild(licenseStateInput);
        licenseStateRow.appendChild(licenseStateKeyCell);
        licenseStateRow.appendChild(licenseStateValueCell);
        table.appendChild(licenseStateRow);
    
        //save button
        const saveButton = document.createElement('button');
        saveButton.innerText = 'Save';
        saveButton.id = 'verifierSaveButton';
        saveButton.addEventListener('click', async()=>{
            saveButton.disabled = true;
            saveButton.classList.add('disabled');
            const updates = {};
            updates['Status'] = statusSelect.value;
            // updates['Series'] = seriesInput.value;
            updates['License#'] = licenseInput.value;
            updates['License State'] = licenseStateInput.value;
            updates['Vin#'] = vinInput.value;
            await verifierUpdateItemToMonday(updates,mondayValues.id);
            const updatedNotification = document.createElement('div');
            updatedNotification.innerText = 'Updated';
            dynamicFrom.appendChild(updatedNotification);
            saveButton.disabled = false;
            saveButton.classList.remove('disabled');
        });
        dynamicFrom.appendChild(table);
        dynamicFrom.appendChild(saveButton);
    }else{
        dynamicFrom.innerText = 'This is not a valid item';
    }
    
    document.body.appendChild(dynamicFrom);
    // document.addEventListener('keydown', async (e)=>{
    //     if(e.ctrlKey && e.keyCode === 83){
    //         e.preventDefault();
    //         // click on save button
    //         const saveButton = document.getElementById('verifierSaveButton');
    //         saveButton.click();
    //     }
    // });
    // document.addEventListener('keyup', async (e)=>{
    //     if(e.ctrlKey ){
    //         e.preventDefault();
    //         console.log('ctrl up');
    //     }
    // });
    // const openingVerifierOptions = ()=>{};
    // chrome.contextMenus.create({
    //     title: "Open Verifier Form",
    //     contexts:["selection"],  // ContextType
    //     onclick: openingVerifierOptions // A callback function
    // });
};
const popupSetup = async () => {
    console.log('popup');
    document.body.id ="POPUP";
    const metas = fixedData.metaInformation;
    const popupMetaDB = new ChromeStorage('metaInformation');
    let popupMetaValues = await popupMetaDB.GET();
    popupMetaValues = popupMetaValues==null?{}:popupMetaValues;
    const metaKeys = Object.keys(metas);
    for(let i=0;i<metaKeys.length;i++){
        const metaKey = metaKeys[i];
        const meta = metas[metaKey];
        if(meta.interactive==true){
            const label = document.createElement('label');
            label.innerText = meta.title;
            const input = document.createElement('input');
            input.setAttribute('type', meta.type);
            input.setAttribute('id', metaKey);
            // input.setAttribute('placeholder', meta.title);
            // input.setAttribute(meta.point, meta.defaultValue);
            if(popupMetaValues[metaKey]==null){
                popupMetaValues[metaKey] = meta.defaultValue;
            }
            input[meta.point] = popupMetaValues[metaKey];
            document.body.append(label,input);
        }else{
            // readd only
            const label = document.createElement('label');
            label.innerText = `${meta.title}: ${popupMetaValues[metaKey]}`;
            document.body.append(label);
        }
    }
    const saveButton = document.createElement('button');
    saveButton.innerText = 'Save';
    saveButton.addEventListener('click', async ()=>{
        for(let i=0;i<metaKeys.length;i++){
            if(metas[metaKeys[i]].interactive==true){
                const metaKey = metaKeys[i];
                const meta = metas[metaKey];
                popupMetaValues[metaKey] = document.getElementById(metaKey)[meta.point];
            }
        }
        await popupMetaDB.SET(popupMetaValues);
        window.close();
    });
    document.body.appendChild(saveButton);
};

(async ()=>{
    if(typeof window=== 'undefined'){
        console.log('background');
        chrome.runtime.onMessage.addListener(
            function(request, sender, sendResponse) {
              switch(request.action){
                case 'userLogout':
                  chrome.cookies.remove({"url": 'https://facebook.com', "name": 'c_user'}, function(cookie) {});
                  sendResponse('success');
                break;
              }
            }
        );
    }else{
        if(window.location.href.includes('chrome-extension')){
           
            await popupSetup();
        }else{

            await contentSetup();
        }
    }
})();




















function dragElement(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if (document.getElementById(elmnt.id + "header")) {
    document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
    } else {
    elmnt.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
    e = e || window.event;
    // e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
    }
}