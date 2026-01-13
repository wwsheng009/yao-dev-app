//yao run scripts.mcpclient.search
function search(){

    const client = new MCP("sap");
    // 使用 JavaScript 函数处理事件
    client.Connect();
    const res = client.Initialize();
    const tools = client.ListTools();

    return tools
}

//yao run scripts.mcpclient.search
function sap(){

    const client = new MCP("sap");
    // 使用 JavaScript 函数处理事件
    // client.OnEvent("connected", "scripts.mcpclient.OnConnect");

    // client.OnEvent("disconnected", "scripts.mcpclient.OnDisConnect");
    client.Connect();
    const res = client.Initialize();
    // const tools = client.ListTools();
    const ddics =  client.CallTool('ddicElement',{"path":"vbak"})

    return parsedata(ddics)
    // return tools
}

function parsedata(data){
    const str = data.content[0].text;
    const jsoncontent = JSON.parse(str).content;
    const type = jsoncontent[0].type
    const text = jsoncontent[0].text
    if (type == "text"){
        const xxx = JSON.parse(text)
        console.log(xxx.status)
        return xxx.result
    }
    return text
}

//yao run scripts.mcpclient.getObjectSource
function getObjectSource(){

    const client = new MCP("sap");
    // 使用 JavaScript 函数处理事件
    // client.OnEvent("connected", "scripts.mcpclient.OnConnect");

    // client.OnEvent("disconnected", "scripts.mcpclient.OnDisConnect");
    client.Connect();
    const res = client.Initialize();
    // const tools = client.ListTools();
    const objSource = client.CallTool('getObjectSource',{objectSourceUrl:"/sap/bc/adt/programs/programs/zvi_basis_copy_user/source/main"})

    return JSON.parse(objSource.content[0]["text"])
    // return tools
}

//yao run scripts.mcpclient.OnConnect
function OnConnect(event){
        console.log("✓ Connected:", event);
}

//yao run scripts.mcpclient.OnDisConnect
function OnDisConnect(event){
        console.log("✓ Connected:", event);
}