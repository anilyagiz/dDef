async function fundAccount(accountPubKey) {
    const transaction = new web3.Transaction().add(
        web3.SystemProgram.transfer({
            fromPubkey: payer.publicKey,
            toPubkey: accountPubKey,
            lamports: 10000000,  
        })
    );
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payer.publicKey;
    transaction.sign(payer);
    const txId = await connection.sendTransaction(transaction, [payer]);
    console.log(`Funds transferred to address ${accountPubKey.toBase58()}.`);
}

async function sendTransactionWithData(dataAccount, instructionData) {
    const transaction = new web3.Transaction().add(
        new web3.TransactionInstruction({
            keys: [
                { pubkey: dataAccount.publicKey, isSigner: false, isWritable: true },
            ],
            programId: PROGRAM_ID,
            data: instructionData
        })
    );

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payer.publicKey;
    transaction.sign(payer);

    try {
        const txId = await connection.sendTransaction(transaction, [payer]);
        console.log(`Transaction sent with txID: ${txId}. Awaiting confirmation...`);
        await connection.confirmTransaction(txId, 'confirmed');
        console.log(`Transaction with txID: ${txId} confirmed.`);
    } catch (error) {
        console.error(`Transaction failed to send: ${error.message}`);
    }
}

async function cancelFunction(dataAccount) {
    console.log("Attempting to cancel withdrawal operation...");
    const instructionData = Buffer.concat([
        Buffer.from([1]), // Instruction tag for CancelFunction
        Buffer.from(Uint32Array.of(0).buffer) // function_index, a fixed 4-byte buffer set to 0
    ]);
    await sendTransactionWithData(dataAccount, instructionData);
}

async function checkExecution(dataAccount) {
    try {
        const accountInfo = await connection.getAccountInfo(dataAccount.publicKey);
        if (accountInfo.data[0] === 0) {
            console.log("Withdrawal operation is queued but not yet executed.");
        } else if (accountInfo.data[0] === 1) {
            console.log("Withdrawal operation cancelled.");
        } else {
            console.log("Withdrawal operation executed.");
        }
    } catch (error) {
        console.error(`Execution check failed: ${(error as any).message}`);
    }
}

async function setDelegate(dataAccount) {
    const delegateAnswer = await inquirer.prompt([
        {
            type: 'input',
            name: 'delegate',
            message: 'Enter the public key of the trusted delegate:',
        }
    ]);

    const delegatePublicKey = new web3.PublicKey(delegateAnswer.delegate);
    const instructionData = Buffer.concat([Buffer.from([2]), delegatePublicKey.toBuffer()]);
    await sendTransactionWithData(dataAccount, instructionData);
}

async function queueCriticalFunction(criticalFunction, delayInSeconds) {
    const PROGRAM_ID = new PublicKey('pubkey adress');

    
    // Create the transaction
    const transaction = new Transaction().add({
        keys: [{ pubkey: PROGRAM_ID, isSigner: false, isWritable: true }],
        programId: PROGRAM_ID,
        data: serializeInstruction({
            type: 'QueueCriticalFunction',
            function: criticalFunction,  
            delay_in_seconds: delayInSeconds,
        }),
    });

    // Sign and send the transaction
    await sendAndConfirmTransaction(connection, transaction, [payer]);
}

async function callCriticalFunction(dataAccount, criticalFunction, delayInSeconds) {
    console.log("Initiating withdrawal of all funds...");
    console.log("⚠️ WARNING: Critical operation detected");
    const instruction = {
        type: 'QueueCriticalFunction',
        function: criticalFunction,
        delay_in_seconds: delayInSeconds,
    };
    const instructionData = serializeInstruction(instruction);
    console.log(`Serialized data: ${instructionData.toString('hex')}`);
    await sendTransactionWithData(dataAccount, instructionData);
}

async function main() {
    const dataAccount = web3.Keypair.generate();
    console.log(`Using new data account: ${dataAccount.publicKey.toBase58()}`);
    await fundAccount(dataAccount.publicKey);

    const questions = [
        {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: ['Withdraw All Funds', 'Cancel Transaction', 'Check Execution Status', 'Assign Delegate'],
        }
    ];

    const answers = await inquirer.prompt(questions);

    switch(answers.action) {
        case 'Withdraw All Funds':
            const amountInLamports = 1000000; 
            const targetPubkey = "pubkey adresi"; 
            const criticalFunction = {
                type: 'WithdrawAllFunds',
                target_pubkey: targetPubkey,
                amount: BigInt(amountInLamports)
            };
            await callCriticalFunction(dataAccount, criticalFunction, BigInt(30));  // 30 seconds delay
            break;

        case 'Cancel Transaction':
            await cancelFunction(dataAccount);
            break;

        case 'Check Execution Status':
            await checkExecution(dataAccount);
            break;

    }
}

main();
