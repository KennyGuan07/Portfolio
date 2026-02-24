import javafx.animation.AnimationTimer;
import javafx.application.Platform;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.canvas.Canvas;
import javafx.scene.canvas.GraphicsContext;
import javafx.scene.control.*;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.image.PixelReader;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.shape.Circle;
import javafx.scene.shape.Rectangle;
import javafx.scene.text.Font;
import javafx.stage.FileChooser;
import javafx.stage.Popup;
import javafx.stage.Stage;

import java.io.*;
import java.net.Socket;
import java.util.*;

public class MainWindow {
    final int MSG_NAME = 0;
    final int MSG_PIXELS = 1;
    final int MSG_CHAT = 2;
    final int MSG_FULL_SKETCH = 3;
    final int MSG_CLEAR = 4;
    final int MSG_WHISPER = 8;
    final int MSG_GAME_OVER = 10;
    final int MSG_LOBBY_UPDATE = 20;
    final int MSG_GAME_STATE = 21;
    final int MSG_YOUR_TURN = 22;
    final int MSG_LEADERBOARD = 23;
    final int MSG_MODE = 25; // NEW
    final int MSG_CLIENT_READY = 50;
    final int MSG_HOST_START = 51;

    @FXML StackPane rootStack;
    @FXML VBox lobbyOverlay;
    @FXML HBox lobbyCirclesBox;
    @FXML Button btnReady;
    @FXML Button btnStartGame;

    @FXML Label lblTopInfo;
    @FXML ComboBox<String> cmbTool;
    @FXML Rectangle rectCurrentColor;
    @FXML Button btnSelectColor;
    @FXML Canvas canvas;
    @FXML StackPane canvasContainer;
    @FXML ListView<String> leaderboardList;
    @FXML TextArea chatArea;
    @FXML TextField chatInput;
    @FXML Button btnSend;
    @FXML Button btnClear;
    @FXML Button btnUndo;

    @FXML Button btnSave; // NEW
    @FXML Button btnLoad; // NEW

    private Stage stage;
    private Socket socket;
    private DataInputStream in;
    private DataOutputStream out;
    private String username;

    private int[][] gridData;
    private int canvasSize = 50;
    private double pixelSize = 10;
    private int selectedColorARGB = 0xFF000000;
    private boolean isHost = false;
    private boolean canDraw = true;
    private String currentTargetWord = "---";
    private boolean isDrawGuessMode = false; // NEW

    class Point { int x, y; Point(int x, int y){this.x=x;this.y=y;} }

    public MainWindow(Stage stage, String username, String ip, int port, boolean isHost, boolean isDrawGuessMode) throws IOException {
        this.stage = stage;
        this.username = username;
        this.isHost = isHost;
        this.isDrawGuessMode = isDrawGuessMode; // NEW: Init for host
        this.gridData = new int[canvasSize][canvasSize];

        socket = new Socket(ip, port);
        in = new DataInputStream(socket.getInputStream());
        out = new DataOutputStream(socket.getOutputStream());

        out.write(MSG_NAME);
        out.writeUTF(username);

        FXMLLoader loader = new FXMLLoader(getClass().getResource("mainWindownUI.fxml"));
        loader.setController(this);
        Parent root = loader.load();
        Scene scene = new Scene(root);
        stage.setScene(scene);
        stage.setTitle("KidPaint - " + username);
        stage.show();

        initUI();

        new Thread(this::listen).start();
        new AnimationTimer() { public void handle(long now) { render(); } }.start();
    }

    private void initUI() {
        btnStartGame.setVisible(isHost);
        btnStartGame.setOnAction(e -> sendSimple(MSG_HOST_START));
        btnReady.setOnAction(e -> sendSimple(MSG_CLIENT_READY));

        btnSend.setOnAction(e -> sendChat());
        chatInput.setOnAction(e -> sendChat());
        btnSelectColor.setOnAction(e -> showColorPopup());
        rectCurrentColor.setFill(Color.BLACK);
        btnClear.setOnAction(e -> sendSimple(MSG_CLEAR));

        // NEW: Save and Load
        btnSave.setOnAction(e -> saveSketch());
        btnLoad.setOnAction(e -> loadSketch());

        leaderboardList.getItems().add("Waiting for scores...");

        canvas.widthProperty().bind(canvasContainer.widthProperty());
        canvas.heightProperty().bind(canvasContainer.heightProperty());

        canvas.widthProperty().addListener(obs -> calculateGrid());
        canvas.heightProperty().addListener(obs -> calculateGrid());

        canvas.setOnMouseDragged(e -> handleDrag(e.getX(), e.getY()));
        canvas.setOnMousePressed(e -> handleClick(e.getX(), e.getY()));
    }

    // --- Save / Load Logic ---

    private void saveSketch() {
        FileChooser fileChooser = new FileChooser();
        fileChooser.setTitle("Save Sketch");
        fileChooser.getExtensionFilters().add(new FileChooser.ExtensionFilter("KidPaint Data", "*.dat"));
        File file = fileChooser.showSaveDialog(stage);
        if (file != null) {
            try (DataOutputStream dos = new DataOutputStream(new FileOutputStream(file))) {
                dos.writeInt(canvasSize);
                for (int i = 0; i < canvasSize; i++) {
                    for (int j = 0; j < canvasSize; j++) {
                        dos.writeInt(gridData[i][j]);
                    }
                }
            } catch (IOException ex) { ex.printStackTrace(); }
        }
    }

    private void loadSketch() {
        if (!canDraw) return; // Only allow load if it's your turn (or Draw Together mode)

        FileChooser fileChooser = new FileChooser();
        fileChooser.setTitle("Load Sketch");
        fileChooser.getExtensionFilters().add(new FileChooser.ExtensionFilter("KidPaint Data", "*.dat"));
        File file = fileChooser.showOpenDialog(stage);
        if (file != null) {
            try (DataInputStream dis = new DataInputStream(new FileInputStream(file))) {
                int size = dis.readInt();

                // 1. Wipe the board first
                sendSimple(MSG_CLEAR);

                // 2. Read pixels and group them by color for batch sending
                Map<Integer, List<Point>> colorMap = new HashMap<>();

                for (int i = 0; i < size; i++) {
                    for (int j = 0; j < size; j++) {
                        int color = dis.readInt();
                        // Only process non-empty pixels that fit on current canvas
                        if (color != 0 && i < canvasSize && j < canvasSize) {
                            colorMap.computeIfAbsent(color, k -> new ArrayList<>()).add(new Point(i, j));
                        }
                    }
                }

                // 3. Send batches to server (so everyone sees the loaded image)
                for (Map.Entry<Integer, List<Point>> entry : colorMap.entrySet()) {
                    sendPixels(entry.getKey(), entry.getValue());
                }

            } catch (IOException ex) { ex.printStackTrace(); }
        }
    }

    private void calculateGrid() {
        if (canvasSize == 0) return;
        double size = Math.floor(Math.min(canvas.getWidth(), canvas.getHeight()));
        if(size > 0) pixelSize = size / canvasSize;
    }

    private void handleDrag(double mx, double my) {
        if (!canDraw || gridData == null) return;
        if ("Bucket".equals(cmbTool.getValue())) return;

        Point p = getGridPoint(mx, my);
        if (p != null) {
            List<Point> points = new ArrayList<>();
            points.add(p);

            if ("Pen".equals(cmbTool.getValue())) {
                sendPixels(selectedColorARGB, points);
                gridData[p.x][p.y] = selectedColorARGB;
            } else if ("Eraser".equals(cmbTool.getValue())) {
                sendPixels(0, points);
                gridData[p.x][p.y] = 0;
            }
        }
    }

    private void handleClick(double mx, double my) {
        if (!canDraw || gridData == null) return;

        Point p = getGridPoint(mx, my);
        if (p != null) {
            if ("Bucket".equals(cmbTool.getValue())) {
                int targetColor = gridData[p.x][p.y];
                if (targetColor != selectedColorARGB) {
                    List<Point> filled = floodFill(p.x, p.y, targetColor, selectedColorARGB);
                    sendPixels(selectedColorARGB, filled);
                }
            } else {
                handleDrag(mx, my);
            }
        }
    }

    private Point getGridPoint(double mx, double my) {
        double w = canvas.getWidth();
        double h = canvas.getHeight();
        double size = Math.floor(Math.min(w, h));
        double startX = Math.floor((w - size) / 2);
        double startY = Math.floor((h - size) / 2);
        double pxSize = size / canvasSize;

        if (mx >= startX && mx < startX + size && my >= startY && my < startY + size) {
            int col = (int)((mx - startX) / pxSize);
            int row = (int)((my - startY) / pxSize);
            if (col >= 0 && col < canvasSize && row >= 0 && row < canvasSize) {
                return new Point(col, row);
            }
        }
        return null;
    }

    private List<Point> floodFill(int x, int y, int targetColor, int replaceColor) {
        List<Point> result = new ArrayList<>();
        if (targetColor == replaceColor) return result;

        int width = gridData.length;
        int height = gridData[0].length;
        boolean[][] visited = new boolean[width][height];
        Queue<Point> queue = new LinkedList<>();

        queue.add(new Point(x, y));
        visited[x][y] = true;

        while (!queue.isEmpty()) {
            Point p = queue.poll();
            result.add(p);

            int[] dx = {0, 0, 1, -1};
            int[] dy = {1, -1, 0, 0};

            for (int i = 0; i < 4; i++) {
                int nx = p.x + dx[i];
                int ny = p.y + dy[i];

                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    if (!visited[nx][ny] && gridData[nx][ny] == targetColor) {
                        visited[nx][ny] = true;
                        queue.add(new Point(nx, ny));
                    }
                }
            }
        }
        for(Point p : result) gridData[p.x][p.y] = replaceColor;
        return result;
    }

    private void showColorPopup() {
        Popup popup = new Popup();
        Image img;
        try {
            img = new Image("file:color_palette.jpg");
            if (img.isError()) img = new Image("file:color_palette.png");
        } catch(Exception e) { return; }

        ImageView iv = new ImageView(img);
        iv.setFitWidth(200);
        iv.setPreserveRatio(true);
        iv.setStyle("-fx-effect: dropshadow(three-pass-box, rgba(0,0,0,0.5), 10, 0, 0, 0);");

        iv.setOnMouseClicked(e -> {
            if (iv.getImage() == null) return;
            PixelReader pr = iv.getImage().getPixelReader();
            double scaleX = iv.getImage().getWidth() / iv.getBoundsInLocal().getWidth();
            double scaleY = iv.getImage().getHeight() / iv.getBoundsInLocal().getHeight();
            int x = (int)(e.getX() * scaleX);
            int y = (int)(e.getY() * scaleY);

            if(x >= 0 && x < iv.getImage().getWidth() && y >= 0 && y < iv.getImage().getHeight()){
                Color c = pr.getColor(x, y);
                selectedColorARGB = (int)(c.getRed()*255) << 16 | (int)(c.getGreen()*255) << 8 | (int)(c.getBlue()*255);
                selectedColorARGB |= 0xFF000000;
                rectCurrentColor.setFill(c);
                popup.hide();
            }
        });

        popup.getContent().add(iv);
        popup.setAutoHide(true);
        popup.show(stage);
    }

    private void render() {
        GraphicsContext gc = canvas.getGraphicsContext2D();
        double w = canvas.getWidth();
        double h = canvas.getHeight();

        gc.clearRect(0, 0, w, h);

        double size = Math.floor(Math.min(w, h));
        double startX = Math.floor((w - size) / 2);
        double startY = Math.floor((h - size) / 2);

        gc.setFill(Color.WHITE);
        gc.fillRect(startX, startY, size, size);

        if (gridData == null) return;

        double pxSize = size / canvasSize;

        for (int i = 0; i < canvasSize; i++) {
            for (int j = 0; j < canvasSize; j++) {
                int color = gridData[i][j];
                if (color != 0) {
                    gc.setFill(Color.rgb((color >> 16) & 0xFF, (color >> 8) & 0xFF, color & 0xFF));
                    gc.fillRect(startX + i * pxSize, startY + j * pxSize, pxSize + 0.6, pxSize + 0.6);
                }
            }
        }
    }

    private void sendPixels(int color, List<Point> points) {
        try {
            out.write(MSG_PIXELS);
            out.writeInt(color);
            out.writeInt(points.size());
            for(Point p : points) {
                out.writeInt(p.x);
                out.writeInt(p.y);
            }
        } catch (IOException e) {}
    }

    private void sendSimple(int type) { try { out.write(type); } catch(IOException e) {} }

    private void sendChat() {
        try {
            String t = chatInput.getText().trim();
            if(!t.isEmpty()) {
                if (t.startsWith("/w ")) {
                    String[] parts = t.split(" ", 3);
                    if (parts.length == 3) {
                        out.write(MSG_WHISPER);
                        out.writeUTF(parts[1]); // Target Name
                        out.writeUTF(parts[2]); // Message
                        chatInput.clear();
                        return;
                    }
                }
                out.write(MSG_CHAT);
                out.writeUTF(t);
                chatInput.clear();
            }
        } catch(IOException e){}
    }

    private void listen() {
        try {
            while (true) {
                int type = in.read();
                switch (type) {
                    case MSG_LOBBY_UPDATE:
                        int count = in.readInt();
                        HashMap<String, Boolean> status = new HashMap<>();
                        for(int i=0; i<count; i++) status.put(in.readUTF(), in.readBoolean());
                        Platform.runLater(() -> updateLobby(status));
                        break;

                    case MSG_GAME_STATE:
                        String drawer = in.readUTF();
                        int time = in.readInt();
                        Platform.runLater(() -> {
                            boolean isDrawTogether = (time == -1);

                            if (lblTopInfo.getParent() instanceof Region) {
                                Region topBar = (Region) lblTopInfo.getParent();
                                topBar.setVisible(!isDrawTogether);
                                topBar.setManaged(!isDrawTogether);
                            }

                            if (leaderboardList.getParent() instanceof Region) {
                                Region lbBox = (Region) leaderboardList.getParent();
                                lbBox.setVisible(!isDrawTogether);
                                lbBox.setManaged(!isDrawTogether);
                            }

                            if (!isDrawTogether) {
                                lblTopInfo.setText("Time: " + time + " | Word: " + currentTargetWord + " | Drawer: " + drawer);
                            }
                            lobbyOverlay.setVisible(false);
                        });
                        break;

                    case MSG_GAME_OVER:
                        Platform.runLater(() -> {
                            lobbyOverlay.setVisible(true);
                            if (isHost) btnStartGame.setText("RESTART GAME");
                        });
                        break;
                    case MSG_FULL_SKETCH:
                        int newSize = in.readInt();
                        if (this.canvasSize != newSize || gridData == null) {
                            this.canvasSize = newSize;
                            this.gridData = new int[newSize][newSize];
                            Platform.runLater(this::calculateGrid);
                        }
                        for(int i=0; i<newSize; i++)
                            for(int j=0; j<newSize; j++)
                                gridData[i][j] = in.readInt();
                        break;
                    case MSG_PIXELS:
                        int c = in.readInt();
                        int ptsCount = in.readInt();
                        for(int i=0; i<ptsCount; i++) {
                            int x = in.readInt();
                            int y = in.readInt();
                            if(gridData != null && x>=0 && x<canvasSize && y>=0 && y<canvasSize)
                                gridData[x][y] = c;
                        }
                        break;
                    case MSG_CHAT:
                        String msg = in.readUTF();
                        Platform.runLater(() -> chatArea.appendText(msg + "\n"));
                        break;
                    case MSG_YOUR_TURN:
                        boolean myTurn = in.readBoolean();
                        String word = in.readUTF();
                        Platform.runLater(() -> {
                            canDraw = myTurn;
                            currentTargetWord = myTurn ? word : "???";
                            if(myTurn) chatArea.appendText(">>> YOUR TURN! DRAW: " + word.toUpperCase() + " <<<\n");
                            else chatArea.appendText(">>> GUESS THE WORD! <<<\n");
                        });
                        break;
                    case MSG_CLEAR:
                        if(gridData != null)
                            for(int[] row : gridData) java.util.Arrays.fill(row, 0);
                        break;
                    case MSG_LEADERBOARD:
                        int num = in.readInt();
                        ObservableList<String> scores = FXCollections.observableArrayList();
                        for(int i=0; i<num; i++) scores.add(in.readUTF());
                        Platform.runLater(() -> leaderboardList.setItems(scores));
                        break;
                    case MSG_MODE: // NEW
                        isDrawGuessMode = in.readBoolean();
                        break;
                }
            }
        } catch (IOException e) {
            Platform.runLater(() -> stage.close());
        }
    }

    private void updateLobby(HashMap<String, Boolean> status) {
        lobbyCirclesBox.getChildren().clear();
        for (var entry : status.entrySet()) {
            VBox vb = new VBox(5);
            vb.setAlignment(javafx.geometry.Pos.CENTER);

            Circle circle = new Circle(25);
            circle.setFill(entry.getValue() ? Color.LIMEGREEN : Color.GREY);
            circle.setStroke(Color.WHITE);
            circle.setStrokeWidth(2);

            Label nameLabel = new Label(entry.getKey());
            nameLabel.setTextFill(Color.WHITE);
            nameLabel.setFont(new Font("System Bold", 12));

            vb.getChildren().addAll(circle, nameLabel);
            lobbyCirclesBox.getChildren().add(vb);
        }

        // NEW: Disable start button if in Draw & Guess and <2 players
        if (isHost) {
            btnStartGame.setDisable(isDrawGuessMode && status.size() < 2);
        }
    }
}