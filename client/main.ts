// Function to fund an account with a specified public key.
async function fundAccount(accountPubKey) {
    // Construct a transaction to transfer funds to the specified account.
    const transaction = new web3.Transaction().add(
        web3.SystemProgram.transfer({
            fromPubkey: payer.publicKey,
            toPubkey: accountPubKey,
            lamports: 10000000,  // Amount of lamports to transfer
        })
    );
    // Get the latest blockhash for transaction validity.
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payer.publicKey;
    transaction.sign(payer);
    // Send the transaction to the blockchain.
    const txId = await connection.sendTransaction(transaction, [payer]);
    console.log(`Funds transferred to address ${accountPubKey.toBase58()}.`);
}

// Function to send a transaction with provided instruction data.
async function sendTransactionWithData(dataAccount, instructionData) {
    // Construct a transaction with provided instruction data.
    const transaction = new web3.Transaction().add(
        new web3.TransactionInstruction({
            keys: [
                { pubkey: dataAccount.publicKey, isSigner: false, isWritable: true },
            ],
            programId: PROGRAM_ID,
            data: instructionData
        })
    );

    // Get the latest blockhash for transaction validity.
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payer.publicKey;
    transaction.sign(payer);

    try {
        // Send the transaction to the blockchain.
        const txId = await connection.sendTransaction(transaction, [payer]);
        console.log(`Transaction sent with txID: ${txId}. Awaiting confirmation...`);
        // Wait for confirmation of transaction execution.
        await connection.confirmTransaction(txId, 'confirmed');
        console.log(`Transaction with txID: ${txId} confirmed.`);
    } catch (error) {
        console.error(`Transaction failed to send: ${error.message}`);
    }
}

// Function to cancel a withdrawal operation.
async function cancelFunction(dataAccount) {
    console.log("Attempting to cancel withdrawal operation...");
    // Construct instruction data for cancelling function.
    const instructionData = Buffer.concat([
        Buffer.from([1]), // Instruction tag for CancelFunction
        Buffer.from(Uint32Array.of(0).buffer) // function_index, a fixed 4-byte buffer set to 0
    ]);
    // Send transaction with cancellation instruction data.
    await sendTransactionWithData(dataAccount, instructionData);
}

// Function to check the execution status of a function.
async function checkExecution(dataAccount) {
    try {
        // Get the account information associated with the provided data account.
        const accountInfo = await connection.getAccountInfo(dataAccount.publicKey);
        // Check the status based on the first byte of the data.
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

// Function to set a trusted delegate for a critical operation.
async function setDelegate(dataAccount) {
    // Prompt user to enter the public key of the trusted delegate.
    const delegateAnswer = await inquirer.prompt([
        {
            type: 'input',
            name: 'delegate',
            message: 'Enter the public key of the trusted delegate:',
        }
    ]);

    // Convert provided public key to PublicKey object.
    const delegatePublicKey = new web3.PublicKey(delegateAnswer.delegate);
    // Construct instruction data for setting delegate.
    const instructionData = Buffer.concat([Buffer.from([2]), delegatePublicKey.toBuffer()]);
    // Send transaction to set delegate.
    await sendTransactionWithData(dataAccount, instructionData);
}

// Function to queue a critical function with a specified delay.
async function queueCriticalFunction(criticalFunction, delayInSeconds) {
    // Construct the transaction to queue critical function.
    const transaction = new Transaction().add({
        keys: [{ pubkey: PROGRAM_ID, isSigner: false, isWritable: true }],
        programId: PROGRAM_ID,
        data: serializeInstruction({
            type: 'QueueCriticalFunction',
            function: criticalFunction,  
            delay_in_seconds: delayInSeconds,
        }),
    });

    // Sign and send the transaction.
    await sendAndConfirmTransaction(connection, transaction, [payer]);
}

// Function to initiate a critical function call with a specified delay.
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
    // Send transaction to call critical function.
    await sendTransactionWithData(dataAccount, instructionData);
}

// Main function to execute the program logic.
async function main() {
    // Generate a new data account.
    const dataAccount = web3.Keypair.generate();
    console.log(`Using new data account: ${dataAccount.publicKey.toBase58()}`);
    // Fund the data account.
    await fundAccount(dataAccount.publicKey);

    // Prompt user for action selection.
    const questions = [
        {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: ['Withdraw All Funds', 'Cancel Transaction', 'Check Execution Status', 'Assign Delegate'],
        }
    ];

    // Get user's choice of action.
    const answers = await inquirer.prompt(questions);

    // Execute the chosen action.
    switch(answers.action) {
        case 'Withdraw All Funds':
            const amountInLamports = 1000000; 
            const targetPubkey = "pubkey address"; 
            const criticalFunction = {
                type: 'WithdrawAllFunds',
                target_pubkey: targetPubkey,
                amount: BigInt(amountInLamports)
            };
            // Call the critical function to withdraw all funds.
            await callCriticalFunction(dataAccount, criticalFunction, BigInt(30));  // 30 seconds delay
            break;

        case 'Cancel Transaction':
            // Cancel the ongoing transaction.
            await cancelFunction(dataAccount);
            break;

        case 'Check Execution Status':
            // Check the execution status of the function.
            await checkExecution(dataAccount);
            break;
    }
}

// Execute the main function to start the program.
main();
