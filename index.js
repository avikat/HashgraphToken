console.clear();
require("dotenv").config();

const {

    AccountId,
    PrivateKey,
    Client,
    TokenCreateTransaction,
    FileCreateTransaction,
    FileAppendTransaction,
    ContractCreateTransaction,
    ContractFunctionParameters,
    TokenUpdateTransaction,
    ContractExecuteTransaction,
    TokenInfoQuery,
    ContractCallQuery,
    Hbar,
    AccountBalanceQuery,
    TokenId,

} = require("@hashgraph/sdk");
const fs = require("fs")


const operatorId = AccountId.fromString(process.env.OPERATOR_ID);
const operatorKey = PrivateKey.fromString(process.env.OPERATOR_PVKEY);
const treasuryId = AccountId.fromString(process.env.TREASURY_ID);
const tresuryKey = PrivateKey.fromString(process.env.TREASURY_PVKEY);
// const aliceId = AccountId.fromString(process.env.ALICE_ID);
// const aliceKey = PrivateKey.fromString(process.env.ALICE_PVKEY);

const client = Client.forTestnet().setOperator(operatorId,operatorKey);

client.setMaxTransactionFee(new Hbar(0.75));
client.setMaxQueryPayment(new Hbar(0.01));

async function main(){

    console.log(`Step 1\n`);

    const bytecode = fs.readFileSync("MintAssociatetransferHTS_sol_MintAssoTransHTS.bin")

    console.log(`_ Done \n`)

    const tokenCreateTx = await new TokenCreateTransaction()
    .setTokenName("hbarRocks")
    .setTokenSymbol("HROK")
    .setDecimals(0)
    .setInitialSupply(100)
    .setTreasuryAccountId(treasuryId)
    .setAdminKey(tresuryKey)
    .setSupplyKey(tresuryKey)
    .freezeWith(client)
    .sign(tresuryKey);

    const tokenCreateSubmit = await tokenCreateTx.execute(client);
    const tokenCreateRx = await tokenCreateSubmit.getReceipt(client);
    const tokenId = tokenCreateRx.tokenId;
    const tokenAddressSol = tokenId.toSolidityAddress();

    console.log(`- Token ID : ${tokenId}`);
    console.log(`- Token ID in Solidity format: ${tokenAddressSol}`);


    // ======Token query=======


    const tokenInfo1 = await tQueryFcn(tokenId)
    console.log(`- Initial token supply: ${tokenInfo1.totalSupply.low} \n`);

    const fileCreateTx = new FileCreateTransaction()
    .setKeys([tresuryKey])
    .freezeWith(client);

    const fileCreateSign = await fileCreateTx.sign(tresuryKey);
    const fileCreateSubmit = await fileCreateSign.execute(client)
    const fileCreateRx = await fileCreateSubmit.getReceipt(client)

    const bytecodeFileId = fileCreateRx.fileId;
    console.log(` - The smart contract bytecode file ID is ${bytecodeFileId}`);

    // const fileAppendTx = new FileAppendTransaction()
    // .setFileId(bytecodeFileId)
    // .setContents(bytecode)
    // .setMaxChunks(10)
    // .freezeWith(client);

    // const fileAppendSign = await fileAppendTx.sign(tresuryKey);
    // const fileAppendSubmit = await fileCreateSign.execute(client);
    // const fileAppendRx = await fileAppendSubmit.getReceipt(client);

    // console.log(` -Content added: ${fileCreateRx.status}\n`);



    const fileAppendTx = new FileAppendTransaction()
    .setFileId(bytecodeFileId)
    .setContents(bytecode)
    .setMaxChunks(10)
    .freezeWith(client);
    const fileAppendSign = await fileAppendTx.sign(tresuryKey);
    const fileAppendSubmit = await fileAppendSign.execute(client);
    const fileAppendRx = await fileAppendSubmit.getReceipt(client);
    console.log(`- Content added: ${fileAppendRx.status} \n`);

    const contractInstantiateTx = new ContractCreateTransaction()
    .setBytecodeFileId(bytecodeFileId)
    .setGas(3000000)
    .setConstructorParameters(new ContractFunctionParameters().addAddress(tokenAddressSol))

    const contractInstantiateSubmit = await contractInstantiateTx.execute(client);
    const contractInstantiateRx = await contractInstantiateSubmit.getReceipt(client);

    const contractId = contractInstantiateRx.contractId;
    const contractAddress = contractId.toSolidityAddress();

    console.log(`Contract Id - ${contractId}`);
    console.log(` The smart contractID in Solidity format is: ${contractAddress} \n`);


    const tokenInfo2p1 = await tQueryFcn(tokenId)
    console.log(`- Token supply key: ${tokenInfo2p1.supplyKey.toString()}`);

    const tokenUpdateTx = await new TokenUpdateTransaction()
    .setTokenId(tokenId)
    .setSupplyKey(contractId)
    .freezeWith(client)
    .sign(tresuryKey);

    const tokenUpdateSubmit = await tokenUpdateTx.execute(client);
    const tokenUpdateRx = await tokenUpdateSubmit.getReceipt(client);

    console.log(`-token update status: ${tokenUpdateRx.status}`);

    const tokenInfo2p2 = await tQueryFcn(tokenId);
    console.log(`- Token supply key: ${tokenInfo2p2.supplyKey.toString()}`);




    //Mint
    const contractExecTx = await new ContractExecuteTransaction()
    .setContractId(contractId)
    .setGas(3000000)
    .setFunction("mintFungibleToken",new ContractFunctionParameters().addUint64(150));
    const contractExecSubmit = await contractExecTx.execute(client);
    const contractExecRx = await contractExecSubmit.getReceipt(client);
    console.log(`- New tokens minted: ${contractExecRx.status.toString()}`);

    const tokenInfo2p3 = await tQueryFcn(tokenId);
    console.log(`- New Token supply: ${tokenInfo2p3.totalSupply.low} \n`);



    const contractExecTx1 = await new ContractExecuteTransaction()
    .setContractId(contractId)
    .setGas(3000000)
    .setFunction("tokenAssociate", new ContractFunctionParameters().addAddress(operatorId.toSolidityAddress()) )
    .freezeWith(client)

    const contractExecSign1 = await contractExecTx1.sign(operatorKey);
	const contractExecSubmit1 = await contractExecSign1.execute(client);
	const contractExecRx1 = await contractExecSubmit1.getReceipt(client);
    // const contractId1 = contractExecRx1.contractId;

    console.log(`- Token association with Operation's account: ${contractExecRx1.status.toString()} \n`);




    const contractExecTx2 = await new ContractExecuteTransaction()
    .setContractId(contractId)
    .setGas(3000000)
    .setFunction("tokenTransfer", 
                new ContractFunctionParameters()
                .addAddress(treasuryId.toSolidityAddress())
                .addAddress(operatorId.toSolidityAddress())
                .addInt64(50)
                                    
                )
    .freezeWith(client);

    const contractExecSign2 = await contractExecTx2.sign(tresuryKey);
    const contractExecSubmit2 = await contractExecSign2.execute(client);
    const contractExecRx2 = await contractExecSubmit2.getReceipt(client);

    console.log(` - token transfer from Treasury to Operator : ${contractExecRx2.status.toString()}`);


    const tB = await bCheckerFcn(treasuryId);
    const oB = await bCheckerFcn(operatorId);


    console.log(`_ Treasury balance : ${tB} units of token ${tokenId}\n`);
    console.log(` - Alice balance : ${oB} units of token ${tokenId}\n`);

     
    async function bCheckerFcn(aId) {
		let balanceCheckTx = await new AccountBalanceQuery().setAccountId(aId).execute(client);
		return balanceCheckTx.tokens._map.get(tokenId.toString());
	}


    async function tQueryFcn(tId) {
	let info = await new TokenInfoQuery().setTokenId(tId).execute(client);
	return info;
	}


}


main();
