defmodule FelixWeb.PageController do
  use FelixWeb, :controller

  def home(conn, _params) do
    # The home page is often custom made,
    # so skip the default app layout.
    render(conn, :home, layout: false)
  end

  def game(conn, params) do
    IO.inspect(params, label: "params")

    # Assuming you have a name and initial words
    game_name = params["id"]
    initial_words = ["word1", "word2", "word3"]

    # Check and start the game
    case GameServer.check_and_start_game(game_name, initial_words) do
      {:ok, pid} ->
        # Game started successfully
        IO.puts("Game started with PID: #{inspect(pid)}")

      {:error, {:game_already_exists, pid}} ->
        # Game server with this name already exists
        IO.puts("A game with this name already exists with PID: #{inspect(pid)}")
    end

    # The game page is often custom made,
    # so skip the default app layout.
    conn
    |> assign(:game_id, game_name)
    |> render(:game)
  end
end
