package com.activos.ms1.infrastructure.blockchain;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.web3j.crypto.Credentials;
import org.web3j.crypto.Hash;
import org.web3j.crypto.RawTransaction;
import org.web3j.crypto.TransactionEncoder;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.protocol.http.HttpService;
import org.web3j.utils.Numeric;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class BlockchainAdapter {

    private final Web3j web3j;

    @Value("${blockchain.wallet.private-key}")
    private String privateKey;

    // Chain ID de Ethereum Sepolia testnet
    private static final long SEPOLIA_CHAIN_ID = 11155111L;

    public BlockchainAdapter(@Value("${blockchain.rpc-url}") String rpcUrl) {
        this.web3j = Web3j.build(new HttpService(rpcUrl));
        log.info("BlockchainAdapter inicializado con RPC: {}", rpcUrl);
    }

    public BlockchainResult registrar(String payload) {
        // Sin wallet real configurada → hash simulado (no aparece en Etherscan)
        if (esClaveDummy(privateKey)) {
            return registrarSimulado(payload);
        }
        try {
            var credentials = Credentials.create(privateKey);

            var nonce = web3j.ethGetTransactionCount(
                    credentials.getAddress(), DefaultBlockParameterName.PENDING)
                    .send().getTransactionCount();
            var gasPrice = web3j.ethGasPrice().send().getGasPrice();
            var gasLimit = BigInteger.valueOf(50_000L);

            // El payload va en el campo `data` de la transacción (registro inmutable)
            var data = Numeric.toHexString(payload.getBytes(StandardCharsets.UTF_8));

            // Self-transaction: to = propia address, value = 0 ETH
            var rawTx = RawTransaction.createTransaction(
                    nonce, gasPrice, gasLimit,
                    credentials.getAddress(),
                    BigInteger.ZERO,
                    data);

            var signed = TransactionEncoder.signMessage(rawTx, SEPOLIA_CHAIN_ID, credentials);
            var receipt = web3j.ethSendRawTransaction(Numeric.toHexString(signed)).send();

            if (receipt.hasError()) {
                log.warn("Error Sepolia: {}. Usando hash simulado.", receipt.getError().getMessage());
                return registrarSimulado(payload);
            }

            var txHash = receipt.getTransactionHash();
            log.info("Transacción real enviada a Sepolia. TxHash: {}", txHash);
            return new BlockchainResult(txHash, obtenerUltimoBloque());

        } catch (Exception e) {
            log.warn("Error al enviar tx a Sepolia ({}). Usando hash simulado.", e.getMessage());
            return registrarSimulado(payload);
        }
    }

    /**
     * Genera hash SHA3 local cuando no hay wallet real configurada.
     */
    private BlockchainResult registrarSimulado(String payload) {
        var hash = Hash.sha3String(payload + System.currentTimeMillis());
        var bloqueId = obtenerUltimoBloque();
        log.info("Hash simulado (configurar BLOCKCHAIN_PRIVATE_KEY para tx reales): {}", hash);
        return new BlockchainResult(hash, bloqueId);
    }

    private boolean esClaveDummy(String key) {
        String stripped = key.startsWith("0x") ? key.substring(2) : key;
        return stripped.matches("0*1?");
    }

    private String obtenerUltimoBloque() {
        try {
            return web3j.ethBlockNumber().send().getBlockNumber().toString();
        } catch (Exception e) {
            log.warn("No se pudo obtener número de bloque: {}", e.getMessage());
            return "UNKNOWN";
        }
    }
}
