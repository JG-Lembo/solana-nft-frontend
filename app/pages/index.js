import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from 'next/dynamic';

import CandyMachine from "../components/CandyMachine";

import Image from "next/future/image";
import pokeball from "../public/pokeball.svg";

const Home = () => {
const WalletMultiButtonDynamic = dynamic(
    async () =>
        (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
    { ssr: false }
    );
    const wallet = useWallet();
    // Ações
    const renderNotConnectedContainer = () => (
        <div>
            <img src="https://media.giphy.com/media/eSwGh3YK54JKU/giphy.gif" alt="emoji" />

            <div className="button-container">
                <WalletMultiButtonDynamic className="cta-button connect-wallet-button" />
            </div>
        </div>
    );

    return (
      <div className="App">
          <div className="container">
              <div className="header-container">
                <div className="title">
                    <Image alt="Pokeball" className="pokeball" src={pokeball}/>
                    <p className="header">Pokémon Palette Drop</p>
                    <Image alt="Pokeball" className="pokeball" src={pokeball}/>
                </div>
                <p className="sub-text">Máquina de NFTs de Pokémon</p>
                {/* Renderize o botão de conexão com a carteira bem aqui */}
                {wallet.publicKey ? <CandyMachine walletAddress={wallet} /> : renderNotConnectedContainer()}
              </div>
          </div>
      </div>
    );
};

export default Home;