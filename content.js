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
const sleep = (ms) => {return new Promise(resolve => setTimeout(resolve, ms));}
const mondayFetch = async (query) => {
    const mondayResponse = await fetch (
        "https://api.monday.com/v2",
        {
            method: 'post',
            headers:{
                'Content-Type': 'application/json',
                'Authorization' : 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjE1NTQ3NzM5NCwidWlkIjoyMTc2MjYwNiwiaWFkIjoiMjAyMi0wNC0xMlQxMzo0NjozOS4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6ODg0NzExMCwicmduIjoidXNlMSJ9.mpXq7PtWbmneakwja8iB091bZFnElYif7Ji1IyBmmSA'
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
};
const statusToIndexes = {
    "Unverified": 5,
    "Verified": 1,
    "BAD": 4,
    "Verified W/Vin": 17,
}
const indexToStatus = {
    1: "Verified",
    4: "BAD",
    5: "Unverified",
    17: "Verified W/Vin",
}

const verifierGetItemFromMonday = async () => {
    const boardId = globalData.boardId;
    const itemQuery = `
        query{
            items_by_column_values (board_id: ${boardId}, column_id: "text7", column_value: "${window.location.href}") {
                id,
                column_values(){
                    value,
                    title
                }
            }
        }
    `;
    let itemCount = 0;

    let titleCheckData = await mondayFetch(itemQuery); 
    if(titleCheckData.data.items_by_column_values.length!=0){
        itemCount = titleCheckData.data.items_by_column_values.length;
        const validItemValues = {};
        const itemValues = titleCheckData.data.items_by_column_values[itemCount-1].column_values;
        validItemValues.id = titleCheckData.data.items_by_column_values[itemCount-1].id;
        const validItemTitles = Object.keys(validItemTitlesId);
        for(let i=0;i<itemValues.length;i++){
            if(validItemTitles.includes(itemValues[i].title)){
                    validItemValues[itemValues[i].title] = itemValues[i].value;
            }
        }
        const keys = Object.keys(validItemValues);
        for(let i=0;i<keys.length;i++){
            if(keys[i]==="Status"){
                const status = JSON.parse(validItemValues[keys[i]]);
                const statusIndex = status.index;
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

(async()=>{
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
        const seriesRow = document.createElement('tr');
        const seriesKeyCell = document.createElement('td');
        seriesKeyCell.innerText = "Series";
        const seriesValueCell = document.createElement('td');
        const seriesInput = document.createElement('input');
        seriesInput.id = 'verifierSeries';
        seriesInput.value = mondayValues['Series'];
        seriesValueCell.appendChild(seriesInput);
        seriesRow.appendChild(seriesKeyCell);
        seriesRow.appendChild(seriesValueCell);
        table.appendChild(seriesRow);
    
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
    
        //save button
        const saveButton = document.createElement('button');
        saveButton.innerText = 'Save';
        saveButton.id = 'verifierSaveButton';
        saveButton.addEventListener('click', async()=>{
            const updates = {};
            updates['Status'] = statusSelect.value;
            updates['Series'] = seriesInput.value;
            updates['Vin#'] = vinInput.value;
            await verifierUpdateItemToMonday(updates,mondayValues.id);
            const updatedNotification = document.createElement('div');
            updatedNotification.innerText = 'Updated';
            dynamicFrom.appendChild(updatedNotification);
        });
        dynamicFrom.appendChild(table);
        dynamicFrom.appendChild(saveButton);
    }else{
        dynamicFrom.innerText = 'This is not a valid item';
    }
    
    document.body.appendChild(dynamicFrom);


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