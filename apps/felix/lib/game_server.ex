defmodule GameServer do
  use GenServer

  def check_and_start_game(name, initial_words) do
    res = Registry.lookup(Felix.GameRegistry, "server:#{name}");
    IO.inspect(res, label: "res")
    case res do
      [{pid, _}] ->
        # A game server with this name already exists
        {:error, {:game_already_exists, pid}}

      _ ->
        # No game server with this name, so start a new one
        start_new_game(name, initial_words)
    end
  end


  defp start_new_game(name, initial_words) do
    IO.puts "starting new game #{inspect(name)}"
    server_id = {:via, Registry, {Felix.GameRegistry, "server:#{name}"}}
    DynamicSupervisor.start_child(Felix.GameSupervisor, {GameServer, [
      name: server_id,
      initial_words: initial_words  # Fix: Pass initial_words instead of test
    ]})
  end

  # Starting the GenServer with initial state
  def start_link(options) do
    name = Keyword.get(options, :name, "AHHHHHHHHH")
    initial_words = Keyword.get(options, :initial_words, [])

    IO.puts "start_link with name #{inspect(name)}"
    GenServer.start_link(__MODULE__, {initial_words, 0}, name: name)
  end

  # GenServer init callback
  def init({words, score}) do
    IO.puts "Game server initiated with words #{inspect(words)} and score #{inspect(score)}"
    {:ok, {words, List.first(words), score}}
  end

  # Handler for :pass
  def handle_call(:pass, _from, {words, current_word, score}) do
    new_words = List.delete_at(words, 0) ++ [current_word]
    new_current_word = List.first(new_words)
    {:reply, new_current_word, {new_words, new_current_word, score}}
  end

  # Handler for :next
  def handle_call(:next, _from, {words, _current_word, score}) do
    new_words = List.delete_at(words, 0)
    new_current_word = List.first(new_words)
    {:reply, new_current_word, {new_words, new_current_word, score + 100}}
  end

  # Handler for :fail
  def handle_call(:fail, _from, {words, _current_word, score}) do
    new_words = List.delete_at(words, 0)
    new_current_word = List.first(new_words)
    {:reply, new_current_word, {new_words, new_current_word, score}}
  end

  # Public API to pass the current word
  def pass do
    GenServer.call(__MODULE__, :pass)
  end

  # Public API to go to the next word
  def next do
    GenServer.call(__MODULE__, :next)
  end

  # Public API to fail the current word
  def fail do
    GenServer.call(__MODULE__, :fail)
  end
end
