defmodule GameServer do
  use GenServer

  defstruct word_list: [],
            score: 0,
            current_word: nil,
            category: nil

  defp get_server_id(name) when is_binary(name) do
    {:via, Registry, {Felix.GameRegistry, "server:#{name}"}}
  end

  def check_and_start_game(name) do
    res = Registry.lookup(Felix.GameRegistry, "server:#{name}")
    IO.inspect(res, label: "res")

    case res do
      [{pid, _}] ->
        # A game server with this name already exists
        {:error, {:game_already_exists, pid}}

      _ ->
        # No game server with this name, so start a new one
        start_new_game(name)
    end
  end

  defp start_new_game(name) do
    IO.puts("starting new game #{inspect(name)}")
    server_id = get_server_id(name)
    DynamicSupervisor.start_child(Felix.GameSupervisor, {GameServer, name: server_id})
  end

  # Starting the GenServer with initial state
  def start_link(options) do
    IO.inspect(options, label: "start_link options")
    name = Keyword.get(options, :name, "AHHHHHHHHHHHH") |> IO.inspect(label: "name...")

    category = "Test"
    words = ["Apple", "Bicycle", "Cat"]

    IO.puts("start_link with name #{inspect(name)}")

    GenServer.start_link(
      __MODULE__,
      %__MODULE__{
        word_list: words,
        score: 0,
        current_word: List.first(words),
        category: category
      },
      name: name
    )
  end

  # GenServer init callback
  def init(state) do
    IO.puts("Game server initiated with new state")
    {:ok, state}
  end

  # Handler for :pass
  def handle_call(:pass, _from, state) do
    words = state.word_list
    current_word = state.current_word

    new_words = List.delete_at(words, 0) ++ [current_word]
    new_current_word = List.first(new_words)

    {
      :reply,
      new_current_word,
      state
      |> Map.put(:word_list, new_words)
      |> Map.put(:current_word, new_current_word)
      # |> Map.update!(:score, &(&1 - 100))}
    }
  end

  # Handler for :next
  def handle_call(:next, _from, state) do
    words = state.word_list

    new_words = List.delete_at(words, 0)
    new_current_word = List.first(new_words)

    {:reply, new_current_word,
     state
     |> Map.put(:word_list, new_words)
     |> Map.put(:current_word, new_current_word)
     |> Map.update!(:score, &(&1 + 100))}
  end

  # Handler for :fail
  def handle_call(:fail, _from, state) do
    words = state.word_list

    new_words = List.delete_at(words, 0)
    new_current_word = List.first(new_words)

    {:reply, new_current_word,
     state
     |> Map.put(:word_list, new_words)
     |> Map.put(:current_word, new_current_word)}
  end

  # Handler for :get_word_and_category
  def handle_call(:get_word_and_category, _from, state) do
    {:reply, {state.current_word, state.category}, state}
  end

  def handle_call(:get_score, _from, state) do
    {:reply, state.score, state}
  end

  # Public API to get the current word and category
  def get_word_and_category(server_name) do
    server_id = get_server_id(server_name)
    GenServer.call(server_id, :get_word_and_category)
  end

  def get_score(server_name) do
    server_id = get_server_id(server_name)
    GenServer.call(server_id, :get_score)
  end

  # Public API to pass the current word
  def pass(server_name) do
    server_id = get_server_id(server_name)
    GenServer.call(server_id, :pass)
  end

  # Public API to go to the next word
  def next(server_name) do
    server_id = get_server_id(server_name)
    GenServer.call(server_id, :next)
  end

  # Public API to fail the current word
  def fail(server_name) do
    server_id = get_server_id(server_name)
    GenServer.call(server_id, :fail)
  end
end
