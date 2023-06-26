import React, {useEffect, useState} from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { Program, Provider, web3 } from "@project-serum/anchor";
import { MintLayout, TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";
import { sendTransactions } from "./connection.tsx";
import {
    SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    getAtaForMint,
    getNetworkExpire,
    getNetworkToken,
    CIVIC,
} from "./helpers.ts";

const { SystemProgram } = web3;
const opts = {
    preflightCommitment: "processed",
};

import { getMintJsonFiles } from "./mint.js";

import CountdownTimer from '../CountdownTimer';

const candyMachineProgram = new web3.PublicKey("cndy3Z4yapfJBmL3ShUp5exZKqR3z33thTzeNMm2gRZ");

const TOKEN_METADATA_PROGRAM_ID = new web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

const CandyMachine = ({ walletAddress }) => {

    const [candyMachine, setCandyMachine] = useState(null);

    const [mints, setMints] = useState([]);
    const [isMinting, setIsMinting] = useState(false);
    const [isLoadingMints, setIsLoadingMints] = useState(false);
    const [dropped, setDropped] = useState(false);

    const getCandyMachineCreator = async (candyMachine) => {
        const candyMachineID = new PublicKey(candyMachine);
        return await web3.PublicKey.findProgramAddress([Buffer.from("candy_machine"), candyMachineID.toBuffer()], candyMachineProgram);
    };

    const getMetadata = async (mint) => {
        return (
            await PublicKey.findProgramAddress(
                [Buffer.from("metadata"),
                TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                mint.toBuffer()],
                TOKEN_METADATA_PROGRAM_ID
            )
        )[0];
    };

    const getMasterEdition = async (mint) => {
        return (
            await PublicKey.findProgramAddress(
                [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer(), Buffer.from("edition")],
                TOKEN_METADATA_PROGRAM_ID
            )
        )[0];
    };

    const createAssociatedTokenAccountInstruction = (associatedTokenAddress, payer, walletAddress, splTokenMintAddress) => {
        const keys = [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
            { pubkey: walletAddress, isSigner: false, isWritable: false },
            { pubkey: splTokenMintAddress, isSigner: false, isWritable: false },
            {
                pubkey: web3.SystemProgram.programId,
                isSigner: false,
                isWritable: false,
            },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            {
                pubkey: web3.SYSVAR_RENT_PUBKEY,
                isSigner: false,
                isWritable: false,
            },
        ];
        return new web3.TransactionInstruction({
            keys,
            programId: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
            data: Buffer.from([]),
        });
    };

    const getProvider = () => {
        const rpcHost = process.env.NEXT_PUBLIC_SOLANA_RPC_HOST;

        // Crie um novo objeto de conexão
        const connection = new Connection(rpcHost);
        // Crie um novo objeto de provedor Solana
        const provider = new Provider(
          connection,
          window.solana,
          opts.preflightCommitment
        );
      
        return provider;
    };

    const getCandyMachineState = async () => { 

        const provider = getProvider();
        const idl = await Program.fetchIdl(candyMachineProgram, provider);
        const program = new Program(idl, candyMachineProgram, provider);
        const candyMachine = await program.account.candyMachine.fetch(
          process.env.NEXT_PUBLIC_CANDY_MACHINE_ID
        );

        const itemsAvailable = candyMachine.data.itemsAvailable.toNumber();
        const itemsRedeemed = candyMachine.itemsRedeemed.toNumber();
        const itemsRemaining = itemsAvailable - itemsRedeemed;
        const goLiveData = candyMachine.data.goLiveDate.toNumber();
        const presale =
          candyMachine.data.whitelistMintSettings &&
          candyMachine.data.whitelistMintSettings.presale &&
          (!candyMachine.data.goLiveDate ||
            candyMachine.data.goLiveDate.toNumber() > new Date().getTime() / 1000);
      
        const goLiveDateTimeString = `${new Date(
          goLiveData * 1000
        ).toGMTString()}`
      
        // Adicione esses dados ao seu estado para renderizar
        setCandyMachine({
          id: new web3.PublicKey(process.env.NEXT_PUBLIC_CANDY_MACHINE_ID),
          program,
          state: {
            authority: candyMachine.authority,
            retainAuthority: candyMachine.data.retainAuthority,
            itemsAvailable,
            itemsRedeemed,
            itemsRemaining,
            goLiveData,
            goLiveDateTimeString,
            isSoldOut: itemsRemaining === 0,
            isActive:
              (presale ||
                candyMachine.data.goLiveDate.toNumber() < new Date().getTime() / 1000) &&
              (candyMachine.endSettings
                ? candyMachine.endSettings.endSettingType.date
                  ? candyMachine.endSettings.number.toNumber() > new Date().getTime() / 1000
                  : itemsRedeemed < candyMachine.endSettings.number.toNumber()
                : true),
            isPresale: presale,
            goLiveDate: candyMachine.data.goLiveDate,
            treasury: candyMachine.wallet,
            tokenMint: candyMachine.tokenMint,
            gatekeeper: candyMachine.data.gatekeeper,
            endSettings: candyMachine.data.endSettings,
            whitelistMintSettings: candyMachine.data.whitelistMintSettings,
            hiddenSettings: candyMachine.data.hiddenSettings,
            price: candyMachine.data.price,
          },
        });
      
        console.log({
          itemsAvailable,
          itemsRedeemed,
          itemsRemaining,
          goLiveData,
          goLiveDateTimeString,
        });
    };

    const getCollectionPDA = async (candyMachineAddress) => {
        return (
            await web3.PublicKey.findProgramAddress(
                [Buffer.from("collection"), candyMachineAddress.toBuffer()],
                candyMachineProgram
            )
        );
    };

    const getCollectionAuthorityRecordPDA = async (mint, newAuthority) => {
        return (
          await web3.PublicKey.findProgramAddress(
            [
              Buffer.from("metadata"),
              TOKEN_METADATA_PROGRAM_ID.toBuffer(),
              mint.toBuffer(),
              Buffer.from("collection_authority"),
              newAuthority.toBuffer(),
            ],
            TOKEN_METADATA_PROGRAM_ID
          )
        )[0];
      };

    const mintToken = async () => {

        try {
            setIsMinting(true);
            
            const mint = web3.Keypair.generate();
            
            const userTokenAccountAddress = (await getAtaForMint(mint.publicKey, walletAddress.publicKey))[0];

            const userPayingAccountAddress = candyMachine.state.tokenMint
                ? (await getAtaForMint(candyMachine.state.tokenMint, walletAddress.publicKey))[0]
                : walletAddress.publicKey;

            const candyMachineAddress = candyMachine.id;
            const remainingAccounts = [];
            const signers = [mint];
            const cleanupInstructions = [];
            const instructions = [
                web3.SystemProgram.createAccount({
                    fromPubkey: walletAddress.publicKey,
                    newAccountPubkey: mint.publicKey,
                    space: MintLayout.span,
                    lamports: await candyMachine.program.provider.connection.getMinimumBalanceForRentExemption(MintLayout.span),
                    programId: TOKEN_PROGRAM_ID,
                }),
                Token.createInitMintInstruction(TOKEN_PROGRAM_ID, mint.publicKey, 0, walletAddress.publicKey, walletAddress.publicKey),
                createAssociatedTokenAccountInstruction(
                    userTokenAccountAddress,
                    walletAddress.publicKey,
                    walletAddress.publicKey,
                    mint.publicKey
                ),
                Token.createMintToInstruction(TOKEN_PROGRAM_ID, mint.publicKey, userTokenAccountAddress, walletAddress.publicKey, [], 1),
            ];

            if (candyMachine.state.gatekeeper) {
                remainingAccounts.push({
                    pubkey: (await getNetworkToken(walletAddress.publicKey, candyMachine.state.gatekeeper.gatekeeperNetwork))[0],
                    isWritable: true,
                    isSigner: false,
                });
                if (candyMachine.state.gatekeeper.expireOnUse) {
                    remainingAccounts.push({
                        pubkey: CIVIC,
                        isWritable: false,
                        isSigner: false,
                    });
                    remainingAccounts.push({
                        pubkey: (await getNetworkExpire(candyMachine.state.gatekeeper.gatekeeperNetwork))[0],
                        isWritable: false,
                        isSigner: false,
                    });
                }
            }
            if (candyMachine.state.whitelistMintSettings) {
                const mint = new web3.PublicKey(candyMachine.state.whitelistMintSettings.mint);

                const whitelistToken = (await getAtaForMint(mint, walletAddress.publicKey))[0];
                remainingAccounts.push({
                    pubkey: whitelistToken,
                    isWritable: true,
                    isSigner: false,
                });

                if (candyMachine.state.whitelistMintSettings.mode.burnEveryTime) {
                    const whitelistBurnAuthority = web3.Keypair.generate();

                    remainingAccounts.push({
                        pubkey: mint,
                        isWritable: true,
                        isSigner: false,
                    });
                    remainingAccounts.push({
                        pubkey: whitelistBurnAuthority.publicKey,
                        isWritable: false,
                        isSigner: true,
                    });
                    signers.push(whitelistBurnAuthority);
                    const exists = await candyMachine.program.provider.connection.getAccountInfo(whitelistToken);
                    if (exists) {
                        instructions.push(
                            Token.createApproveInstruction(
                                TOKEN_PROGRAM_ID,
                                whitelistToken,
                                whitelistBurnAuthority.publicKey,
                                walletAddress.publicKey,
                                [],
                                1
                            )
                        );
                        cleanupInstructions.push(Token.createRevokeInstruction(TOKEN_PROGRAM_ID, whitelistToken, walletAddress.publicKey, []));
                    }
                }
            }

            if (candyMachine.state.tokenMint) {
                const transferAuthority = web3.Keypair.generate();

                signers.push(transferAuthority);
                remainingAccounts.push({
                    pubkey: userPayingAccountAddress,
                    isWritable: true,
                    isSigner: false,
                });
                remainingAccounts.push({
                    pubkey: transferAuthority.publicKey,
                    isWritable: false,
                    isSigner: true,
                });

                instructions.push(
                    Token.createApproveInstruction(
                        TOKEN_PROGRAM_ID,
                        userPayingAccountAddress,
                        transferAuthority.publicKey,
                        walletAddress.publicKey,
                        [],
                        candyMachine.state.price.toNumber()
                    )
                );
                cleanupInstructions.push(
                    Token.createRevokeInstruction(TOKEN_PROGRAM_ID, userPayingAccountAddress, walletAddress.publicKey, [])
                );
            }
            const metadataAddress = await getMetadata(mint.publicKey);
            const masterEdition = await getMasterEdition(mint.publicKey);

            const [candyMachineCreator, creatorBump] = await getCandyMachineCreator(candyMachineAddress);

            instructions.push(
                await candyMachine.program.instruction.mintNft(creatorBump, {
                    accounts: {
                        candyMachine: candyMachineAddress,
                        candyMachineCreator,
                        payer: walletAddress.publicKey,
                        wallet: candyMachine.state.treasury,
                        mint: mint.publicKey,
                        metadata: metadataAddress,
                        masterEdition,
                        mintAuthority: walletAddress.publicKey,
                        updateAuthority: walletAddress.publicKey,
                        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                        rent: web3.SYSVAR_RENT_PUBKEY,
                        clock: web3.SYSVAR_CLOCK_PUBKEY,
                        recentBlockhashes: web3.SYSVAR_SLOT_HASHES_PUBKEY,
                        instructionSysvarAccount: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
                    },
                    remainingAccounts: remainingAccounts.length > 0 ? remainingAccounts : undefined,
                })
            );

            const [collectionPDA] = await getCollectionPDA(candyMachineAddress);
            const collectionPDAAccount =
                await candyMachine.program.provider.connection.getAccountInfo(
                    collectionPDA
                );

            if (collectionPDAAccount && candyMachine.state.retainAuthority) {
                try {
                const collectionData =
                    (await candyMachine.program.account.collectionPda.fetch(
                    collectionPDA
                    ));
                console.log(collectionData);
                const collectionMint = collectionData.mint;
                const collectionAuthorityRecord = await getCollectionAuthorityRecordPDA(
                    collectionMint,
                    collectionPDA
                );
                console.log(collectionMint);
                if (collectionMint) {
                    const collectionMetadata = await getMetadata(collectionMint);
                    const collectionMasterEdition = await getMasterEdition(collectionMint);
                    console.log("Collection PDA: ", collectionPDA.toBase58());
                    console.log("Authority: ", candyMachine.state.authority.toBase58());
                    instructions.push(
                    await candyMachine.program.instruction.setCollectionDuringMint({
                        accounts: {
                        candyMachine: candyMachineAddress,
                        metadata: metadataAddress,
                        payer: walletAddress.publicKey,
                        collectionPda: collectionPDA,
                        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                        instructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
                        collectionMint,
                        collectionMetadata,
                        collectionMasterEdition,
                        authority: candyMachine.state.authority,
                        collectionAuthorityRecord,
                        },
                    })
                    );
                }
                } catch (error) {
                console.error(error);
                }
            }
        
            return (
                await sendTransactions(
                    candyMachine.program.provider.connection,
                    candyMachine.program.provider.wallet,
                    [instructions],
                    [signers],
                    "StopOnFailure",
                    "singleGossip",
                    () => {},
                    () => false,
                    undefined
                )
            ).txs.map((t) => {
                console.log(t);
            t.txid});
        } catch (error) {
            let message = error.msg || 'Erro ao mintar. Tente novamente!';
        
            // If we have an error set our loading flag to false
            setIsMinting(false);
        
            if (!error.msg) {
              if (error.message.indexOf('0x138')) {
              } else if (error.message.indexOf('0x137')) {
                message = `ESGOTADO!`;
              } else if (error.message.indexOf('0x135')) {
                message = `Fundos insuficientes na carteira para a cunhagem.`;
              }
            } else {
              if (error.code === 311) {
                message = `ESGOTADO!`;
              } else if (error.code === 312) {
                message = `A cunhagem ainda não está disponível.`;
              }
            }
        
            console.warn(message);
        }
        return [];
    };

    // Crie a função de renderização
    const renderDropTimer = () => {
        // Obtenha a data atual e dropDate em um objeto JavaScript Date
        const dropDate = new Date(candyMachine.state.goLiveData * 1000);
        return <CountdownTimer dropDate={dropDate} />;
    };

    const checkDropped = () => {
        
        const currentDate = new Date();
        const dropDate = new Date(candyMachine.state.goLiveData * 1000);

        if (dropDate <= currentDate) {
            setDropped(true);
        }
    }

    const renderMintedItems = () => {
        return (
        <div className="gif-container">
          <p className="sub-text">Minted Items ✨</p>
          <div className="gif-grid">
            {mints.map((mint) => (
              <div className="gif-item" key={mint}>
                <img src={mint} alt={`Minted NFT ${mint}`} />
              </div>
            ))}
          </div>
        </div>
        )
    };

    const getMintPNGs = async (jsons) => {
        let mints = [];
        for (var i = 0; i < jsons.length; i++) {
            const mintPNG = await fetch(jsons[i]).then((response) => response.json()).then((data) => data);
            mints.push(mintPNG.image);
        }
        return mints;
    }

    const getMints = async (candyMachine) => {
        if (candyMachine && candyMachine.state) {
            setIsLoadingMints(true);
            const [candyMachineCreator] = await getCandyMachineCreator(candyMachine.id);
            const result = await getMintJsonFiles(candyMachineCreator);
            let mints = await getMintPNGs(result);
            setMints(mints);
            setIsLoadingMints(false);
        }
    }

    useEffect(() => {
        if (candyMachine && candyMachine.state)
            checkDropped();
    }, [candyMachine]);
    
    useEffect(() => {
        getCandyMachineState();
    }, []);

    useEffect(() => {
        getMints(candyMachine);
    }, [candyMachine])
    
    return (
        candyMachine &&
        candyMachine.state && (
        <div className="machine-container">
            {/* Adicione isso no início do nosso componente */}
            {!dropped && renderDropTimer()}
            {dropped && <p>{`Data do Drop: ${candyMachine.state.goLiveDateTimeString}`}</p>}
            <p>{`Itens Cunhados: ${candyMachine.state.itemsRedeemed} / ${candyMachine.state.itemsAvailable}`}</p>
            {/* Verifique se essas propriedades são iguais! */}
            {candyMachine.state.itemsRedeemed === candyMachine.state.itemsAvailable ? (
                <p className="sub-text">Esgotado!🙊</p>
                ) : (
                <button
                    className="cta-button mint-button"
                    onClick={mintToken}
                    disabled={isMinting || !dropped}
                >
                    Cunhar NFT
                </button>
                )
            }
            {mints.length > 0 && renderMintedItems()}
            {isLoadingMints && <p>CARREGANDO CUNHAGENS...</p>}
        </div>
        )
    );
};

export default CandyMachine;
