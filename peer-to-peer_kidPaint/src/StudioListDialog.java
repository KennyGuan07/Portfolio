import javafx.application.Platform;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.ListView;
import javafx.stage.Modality;
import javafx.stage.Stage;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.SocketTimeoutException;

public class StudioListDialog {
    @FXML
    private Label lblStatus;
    @FXML
    private ListView<StudioInfo> listView;
    @FXML
    private Button btnJoin;
    @FXML
    private Button btnRefresh;

    private Stage stage;
    private ObservableList<StudioInfo> studioList = FXCollections.observableArrayList();
    private StudioInfo selectedStudio = null;
    private boolean isDiscovering = false;

    final static int DISCOVERY_PORT = 12346;
    final static String DISCOVERY_REQUEST = "KIDPAINT_DISCOVERY_REQUEST";
    final static String DISCOVERY_REPLY_HEADER = "KIDPAINT_STUDIO:";

    public StudioListDialog(Stage owner) throws IOException {
        FXMLLoader loader = new FXMLLoader(getClass().getResource("StudioListDialog.fxml"));
        loader.setController(this);
        Parent root = loader.load();

        stage = new Stage();
        stage.initOwner(owner);
        stage.initModality(Modality.APPLICATION_MODAL);
        stage.setTitle("Find Studios");
        stage.setScene(new Scene(root));

        listView.setItems(studioList);

        listView.getSelectionModel().selectedItemProperty().addListener((obs, oldVal, newVal) -> {
            btnJoin.setDisable(newVal == null);
        });

        btnJoin.setOnAction(e -> onJoinClick());
        btnRefresh.setOnAction(e -> onRefreshClick());
    }

    private void onJoinClick() {
        selectedStudio = listView.getSelectionModel().getSelectedItem();
        stage.close();
    }

    public StudioInfo showAndWait() {
        startDiscovery();
        stage.showAndWait();
        return selectedStudio;
    }

    private void onRefreshClick() {
        if (isDiscovering) {
            return; // Don't start a new search if one is already running
        }
        studioList.clear(); // Clear the list
        startDiscovery();   // Start a new search
    }

    private void startDiscovery() {
        // Start discovery on a new thread so it doesn't block the UI
        Thread discoveryThread = new Thread(this::discoverServers);
        discoveryThread.start();
    }

    private void discoverServers() {
        isDiscovering = true;
        Platform.runLater(() -> {
            lblStatus.setText("Searching for studios...");
            btnRefresh.setDisable(true); // Disable button while searching
        });

        try (DatagramSocket socket = new DatagramSocket()) {
            socket.setBroadcast(true);
            socket.setSoTimeout(3000); // 3-second timeout

            byte[] sendData = DISCOVERY_REQUEST.getBytes();
            DatagramPacket sendPacket = new DatagramPacket(sendData, sendData.length, InetAddress.getByName("255.255.255.255"), DISCOVERY_PORT);
            socket.send(sendPacket);
            System.out.println("Sent UDP broadcast request.");

            while (true) {
                byte[] receiveBuffer = new byte[1024];
                DatagramPacket receivePacket = new DatagramPacket(receiveBuffer, receiveBuffer.length);
                socket.receive(receivePacket);

                String reply = new String(receivePacket.getData(), 0, receivePacket.getLength());
                System.out.println("Received UDP reply: " + reply);

                String[] parts = reply.split(":");
                if (parts.length >= 3 && parts[0].equals(DISCOVERY_REPLY_HEADER.substring(0, DISCOVERY_REPLY_HEADER.length()-1))) {
                    String studioName = parts[1];
                    String ip = receivePacket.getAddress().getHostAddress();
                    int port = Integer.parseInt(parts[2]);
                    String mode = (parts.length == 4) ? parts[3] : "Unknown";

                    StudioInfo info = new StudioInfo(studioName, ip, port, mode);

                    Platform.runLater(() -> {
                        if (!studioList.stream().anyMatch(s -> s.getIpAddress().equals(ip) && s.getPort() == port)) {
                            studioList.add(info);
                            lblStatus.setText("Found " + studioList.size() + " studio(s)");
                        }
                    });
                }
            }
        } catch (SocketTimeoutException e) {
            System.out.println("Discovery finished.");
            Platform.runLater(() -> {
                if (studioList.isEmpty()) {
                    lblStatus.setText("No studios found. Try refreshing.");
                } else {
                    lblStatus.setText("Select a studio to join.");
                }
            });
        } catch (IOException e) {
            e.printStackTrace();
            Platform.runLater(() -> lblStatus.setText("Error during discovery."));
        } finally {
            isDiscovering = false;
            Platform.runLater(() -> {
                btnRefresh.setDisable(false); // Re-enable button
            });
        }
    }
}