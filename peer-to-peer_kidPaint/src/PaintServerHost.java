import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

public class PaintServerHost implements Runnable {
    // Message Constants
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
    final int MSG_MODE = 25; // NEW: Send game mode to clients
    final int MSG_CLIENT_READY = 50;
    final int MSG_HOST_START = 51;

    private int port;
    private String studioName;
    private int canvasSize;
    private boolean isDrawGuessMode;

    private ServerSocket serverSocket;
    private Map<Socket, WorkerThread> clients = new ConcurrentHashMap<>();
    private Map<String, Integer> scores = new ConcurrentHashMap<>();
    private Map<String, Boolean> readyStatus = new ConcurrentHashMap<>();

    // Game State
    private int[][] gridData;
    private boolean gameStarted = false;
    private Timer gameTimer;
    private int timeRemaining;

    private List<String> words = Arrays.asList("APPLE", "TREE", "HOUSE", "CAR", "SUN", "COMPUTER", "CAT", "DOG", "PIZZA", "FISH", "BOOK");
    private Queue<WorkerThread> drawerQueue = new LinkedList<>();
    private WorkerThread currentDrawer;
    private String currentWord;

    public PaintServerHost(int port, String name, int size, boolean isDrawGuess) throws IOException {
        this.port = port;
        this.studioName = name;
        this.canvasSize = size;
        this.isDrawGuessMode = isDrawGuess;
        this.gridData = new int[size][size];
        this.serverSocket = new ServerSocket(port);
        System.out.println("Server started on port " + port);
    }

    @Override
    public void run() {
        try {
            new Thread(new UdpBroadcastListener(12346, studioName, port, isDrawGuessMode)).start();
            while (true) {
                Socket socket = serverSocket.accept();
                WorkerThread t = new WorkerThread(socket, this);
                clients.put(socket, t);
                t.start();
            }
        } catch (IOException e) { e.printStackTrace(); }
    }

    // --- Logic Handling ---

    public synchronized void handlePixelBatch(WorkerThread worker, int color, List<Point> points) {
        if (isDrawGuessMode && worker != currentDrawer) return;

        List<Point> validPoints = new ArrayList<>();
        for (Point p : points) {
            if (p.x >= 0 && p.x < canvasSize && p.y >= 0 && p.y < canvasSize) {
                gridData[p.x][p.y] = color;
                validPoints.add(p);
            }
        }
        if (!validPoints.isEmpty()) {
            broadcastPixelBatch(color, validPoints);
        }
    }

    public synchronized void handleChat(WorkerThread worker, String text) {
        if (isDrawGuessMode && gameStarted && currentWord != null) {
            if (worker != currentDrawer && text.equalsIgnoreCase(currentWord)) {
                broadcastSystemMsg(worker.getUsername() + " GUESSED THE WORD!");
                scores.put(worker.getUsername(), scores.get(worker.getUsername()) + 10);
                if (currentDrawer != null)
                    scores.put(currentDrawer.getUsername(), scores.get(currentDrawer.getUsername()) + 5);
                broadcastLeaderboard();
                startNewRound();
                return;
            }
        }
        broadcastChat(worker.getUsername(), text);
    }

    public synchronized void handleWhisper(WorkerThread sender, String targetName, String message) {
        WorkerThread target = null;
        for(WorkerThread w : clients.values()) {
            if(w.getUsername().equals(targetName)) {
                target = w;
                break;
            }
        }

        if (target != null) {
            sendDirectMessage(target, "(Whisper from " + sender.getUsername() + "): " + message);
            sendDirectMessage(sender, "(Whisper to " + targetName + "): " + message);
        } else {
            sendDirectMessage(sender, "SYSTEM: User '" + targetName + "' not found.");
        }
    }

    public synchronized void handleClear(WorkerThread worker) {
        if (isDrawGuessMode && worker != currentDrawer) return;
        for(int[] row : gridData) Arrays.fill(row, 0);
        broadcastPacket(MSG_CLEAR);
    }

    public synchronized void handleHostStart() {
        if (gameStarted) return;

        if (isDrawGuessMode && clients.size() < 2) {
            broadcastSystemMsg("At least 2 players required for Draw & Guess mode.");
            return;
        }

        gameStarted = true;
        if (isDrawGuessMode) {
            drawerQueue.clear();
            drawerQueue.addAll(clients.values());
            startNewRound();
        } else {
            // Draw Together Mode: Time -1 signals the UI to hide
            broadcastGameState("Everyone", -1);
            broadcastSystemMsg("Game Started! Draw Together Mode.");
            for (var c : clients.values()) sendTurn(c, true, "");
        }
    }

    // --- Game Loop ---

    private void startNewRound() {
        if (gameTimer != null) gameTimer.cancel();
        handleClear(null);

        if (drawerQueue.isEmpty()) {
            broadcastSystemMsg("GAME OVER! Returning to Lobby...");

            // FIX: Reset all players to Not Ready (False) for the restart
            readyStatus.replaceAll((k, v) -> false);
            broadcastLobbyStatus(); // Update clients with grey circles

            broadcastPacket(MSG_GAME_OVER);
            gameStarted = false;
            return;
        }

        currentDrawer = drawerQueue.poll();
        currentWord = words.get(new Random().nextInt(words.size()));
        broadcastSystemMsg("New Round! Drawer is " + currentDrawer.getUsername());

        for(var c : clients.values()) {
            if (c == currentDrawer) sendTurn(c, true, currentWord);
            else sendTurn(c, false, "");
        }

        timeRemaining = 60;
        gameTimer = new Timer();
        gameTimer.scheduleAtFixedRate(new TimerTask() {
            public void run() {
                timeRemaining--;
                broadcastGameState(currentDrawer.getUsername(), timeRemaining);
                if (timeRemaining <= 0) {
                    broadcastSystemMsg("Time's Up! The word was " + currentWord);
                    startNewRound();
                }
            }
        }, 0, 1000);
    }

    // --- Broadcasting ---

    private void broadcastPixelBatch(int color, List<Point> points) {
        try {
            java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
            DataOutputStream dos = new DataOutputStream(baos);
            dos.write(MSG_PIXELS);
            dos.writeInt(color);
            dos.writeInt(points.size());
            for (Point p : points) {
                dos.writeInt(p.x);
                dos.writeInt(p.y);
            }
            byte[] data = baos.toByteArray();
            for (var c : clients.values()) c.getOutputStream().write(data);
        } catch (IOException e) {}
    }

    private void broadcastChat(String name, String msg) {
        try {
            java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
            DataOutputStream dos = new DataOutputStream(baos);
            dos.write(MSG_CHAT);
            dos.writeUTF(name + ": " + msg);
            byte[] data = baos.toByteArray();
            for (var c : clients.values()) c.getOutputStream().write(data);
        } catch (IOException e) {}
    }

    private void sendDirectMessage(WorkerThread w, String msg) {
        try {
            DataOutputStream out = w.getOutputStream();
            out.write(MSG_CHAT);
            out.writeUTF(msg);
        } catch(IOException e){}
    }

    private void broadcastSystemMsg(String msg) { broadcastChat("SYSTEM", msg); }

    private void broadcastGameState(String drawer, int time) {
        try {
            for (var c : clients.values()) {
                DataOutputStream out = c.getOutputStream();
                out.write(MSG_GAME_STATE);
                out.writeUTF(drawer);
                out.writeInt(time);
            }
        } catch (IOException e) {}
    }

    private void broadcastPacket(int type) {
        try { for (var c : clients.values()) c.getOutputStream().write(type); } catch (IOException e) {}
    }

    private void broadcastLobbyStatus() {
        try {
            java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
            DataOutputStream dos = new DataOutputStream(baos);
            dos.write(MSG_LOBBY_UPDATE);
            dos.writeInt(readyStatus.size());
            for(var entry : readyStatus.entrySet()) {
                dos.writeUTF(entry.getKey());
                dos.writeBoolean(entry.getValue());
            }
            byte[] data = baos.toByteArray();
            for(var c : clients.values()) c.getOutputStream().write(data);
        } catch(Exception e) {}
    }

    private void broadcastLeaderboard() {
        try {
            List<String> list = scores.entrySet().stream().map(e -> e.getKey() + ": " + e.getValue()).collect(Collectors.toList());
            java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
            DataOutputStream dos = new DataOutputStream(baos);
            dos.write(MSG_LEADERBOARD);
            dos.writeInt(list.size());
            for(String s : list) dos.writeUTF(s);
            byte[] data = baos.toByteArray();
            for(var c : clients.values()) c.getOutputStream().write(data);
        } catch(Exception e){}
    }

    private void sendTurn(WorkerThread w, boolean turn, String word) {
        try {
            DataOutputStream out = w.getOutputStream();
            out.write(MSG_YOUR_TURN);
            out.writeBoolean(turn);
            out.writeUTF(word);
        } catch(IOException e){}
    }

    private void sendFullSketch(WorkerThread w) {
        try {
            DataOutputStream out = w.getOutputStream();
            out.write(MSG_FULL_SKETCH);
            out.writeInt(canvasSize);
            for(int i=0; i<canvasSize; i++)
                for(int j=0; j<canvasSize; j++)
                    out.writeInt(gridData[i][j]);
        } catch(IOException e){}
    }

    // --- Helpers ---

    public class Point { int x, y; Point(int x, int y){this.x=x;this.y=y;}}

    class WorkerThread extends Thread {
        Socket socket;
        PaintServerHost server;
        DataOutputStream out;
        String username;

        public WorkerThread(Socket s, PaintServerHost h) throws IOException {
            this.socket = s; this.server = h; this.out = new DataOutputStream(s.getOutputStream());
        }
        public String getUsername() { return username; }
        public void setUsername(String u) { this.username = u; }
        public DataOutputStream getOutputStream() { return out; }
        public Socket getSocket() { return socket; }

        public void run() {
            try (DataInputStream in = new DataInputStream(socket.getInputStream())) {
                while (true) {
                    int type = in.read();
                    switch (type) {
                        case 0: // NAME
                            String name = in.readUTF();
                            server.scores.put(name, 0);
                            server.readyStatus.put(name, false);
                            setUsername(name);
                            server.broadcastSystemMsg(name + " joined.");
                            server.broadcastLobbyStatus();
                            server.sendFullSketch(this);
                            // NEW: Send game mode to the new client
                            out.write(MSG_MODE);
                            out.writeBoolean(server.isDrawGuessMode);
                            break;
                        case MSG_PIXELS:
                            int color = in.readInt();
                            int count = in.readInt();
                            List<Point> pts = new ArrayList<>();
                            for(int i=0; i<count; i++) pts.add(new Point(in.readInt(), in.readInt()));
                            server.handlePixelBatch(this, color, pts);
                            break;
                        case MSG_CHAT: server.handleChat(this, in.readUTF()); break;
                        case MSG_WHISPER:
                            String target = in.readUTF();
                            String msg = in.readUTF();
                            server.handleWhisper(this, target, msg);
                            break;
                        case MSG_CLEAR: server.handleClear(this); break;
                        case MSG_CLIENT_READY:
                            server.readyStatus.put(username, true);
                            server.broadcastLobbyStatus();
                            break;
                        case MSG_HOST_START: server.handleHostStart(); break;
                    }
                }
            } catch (IOException e) {
                server.clients.remove(socket);
                if(username!=null) {
                    server.readyStatus.remove(username);
                    server.broadcastSystemMsg(username + " left.");
                    server.broadcastLobbyStatus();
                }
            }
        }
    }

    class UdpBroadcastListener implements Runnable {
        int udpPort;
        String name;
        int tcpPort;
        boolean isDrawGuess;

        UdpBroadcastListener(int udpPort, String name, int tcpPort, boolean isDrawGuess) {
            this.udpPort = udpPort;
            this.name = name;
            this.tcpPort = tcpPort;
            this.isDrawGuess = isDrawGuess;
        }

        public void run() {
            try (DatagramSocket socket = new DatagramSocket(udpPort)) {
                byte[] buf = new byte[1024];
                while(true) {
                    DatagramPacket packet = new DatagramPacket(buf, buf.length);
                    socket.receive(packet);
                    String msg = new String(packet.getData(), 0, packet.getLength());
                    if(msg.equals("KIDPAINT_DISCOVERY_REQUEST")) {
                        String modeStr = isDrawGuess ? "Draw & Guess" : "Draw Together";
                        String reply = "KIDPAINT_STUDIO:" + name + ":" + tcpPort + ":" + modeStr;
                        socket.send(new DatagramPacket(reply.getBytes(), reply.length(), packet.getAddress(), packet.getPort()));
                    }
                }
            } catch(Exception e){}
        }
    }
}